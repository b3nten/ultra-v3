import { debounce } from "jsr:@std/async/debounce";
import * as esbuild from "npm:esbuild"
import * as path from "jsr:@std/path"
import { parseArgs } from "jsr:@std/cli/parse-args";
import { createLogger, gradients, Levels } from "npm:@benstack/logger@0.0.3"

/****************************************************************************************
 * Utilities
 *****************************************************************************************/

const normalizePath = (p: string) => {
   function slash(path: string): string {
        const isExtendedLengthPath = /^\\\\\?\\/.test(path);
        // deno-lint-ignore no-control-regex
        const hasNonAscii = /[^\u0000-\u0080]+/.test(path);
      
        if (isExtendedLengthPath || hasNonAscii) {
          return path;
        }
      
        return path.replace(/\\/g, "/");
      }
    return slash(path.join(Deno.cwd(), p))
}

const Log = createLogger({
    name: "ULTRA",
    level: Levels.DEBUG,
    color: gradients.purple
})

/****************************************************************************************
 * Dev Middleware
 *****************************************************************************************/

declare global {
    var Ultra: any
}

type Metafile = Record<string, {path: string, imports: Array<{path: string, kind: string}>}>

class DevMiddleware {

    cache = new Map<string, string>
    metafile?: Metafile

    buildPromise?: Promise<void>
    serverEntry?: Promise<(r: Request) => Response | Promise<Response | undefined>> 

    context: Promise<esbuild.BuildContext>;

    constructor(private clientEntryPaths: string[] = ["./client.ts"], private serverEntryPath: string = "./server.ts"){

        this.context = esbuild.context({
            entryPoints: this.clientEntryPaths,
            outdir: "__dist",
            target: "esnext",
            bundle: true,
            splitting: true,
            format: "esm",
            write: false,
            logLevel: "error",
            metafile: true,
            chunkNames: "[name]-[hash]",
            entryNames: "[name]-[hash]",
            assetNames: "[name]-[hash]",
        })

        this.createFileWatcher()
        this.buildPromise = this.build()
    }

    async build(){
        const t = performance.now()
        Log.info("building...")
        await this.buildClientEntry()
        Log.debug("built client entry in", (performance.now() - t).toFixed(0), "ms")
        await this.importServerEntry()
        Log.success("built in", (performance.now() - t).toFixed(0), "ms")
    }

    importServerEntry(){
        globalThis.Ultra = globalThis.Ultra || {}
        globalThis.Ultra.metafile = this.metafile
        return this.serverEntry = import(path.toFileUrl(path.join(Deno.cwd(), this.serverEntryPath)).href + `?dev=${Math.random()}`).then(m => m.default.fetch)
    }

    async buildClientEntry(){
        const c = await this.context
        const b = await c.rebuild()
        for(const f of b.outputFiles ?? []){
            const path = normalizePath(f.path).split("__dist/")[1]
            this.cache.set(path, f.text)
        }
        this.metafile = {}
        for(const [k, v] of Object.entries(b.metafile!.outputs)){
            this.metafile[v.entryPoint!] = {
                path: normalizePath(k).split("__dist/")[1],
                imports: v.imports.map(i => ({path: normalizePath(i.path).split("__dist/")[1], kind: i.kind}))
            }
        }
    }

    async createFileWatcher(){
        const watcher = Deno.watchFs("./");
       
        const handle = debounce((event: Deno.FsEvent) => {
            if(event.kind === "modify"){
                Log.debug("file modified", event.paths)
                this.build()
            }
        }, 100);
        
        for await (const event of watcher) {
          handle(event);
        }
    }

}

/****************************************************************************************
 * Metafile
 *****************************************************************************************/


if(import.meta.main){
    const args = parseArgs(Deno.args, {
        collect: ["client"],
    })

    if(!args.client){
        Log.error("No client entry found")
        Deno.exit(1)
    }

    if(!args.server){
        Log.error("No server entry found")
        Deno.exit(1)
    }
    
    const dev = new DevMiddleware(args.client, args.server)
    await dev.buildPromise;
    Deno.serve({
        onListen: () => {Log.info("Server running on http://localhost:8000")},
    }, async (req) => {
        let res: any;
        const path = new URL(req.url).pathname.substring(1)
        Log.debug("request", path)
        if(dev.cache.has(path)){
            return new Response(dev.cache.get(path), {
                headers: {
                    "content-type": "application/javascript"
                }
            })
        } else {
            const serverEntry = await dev.serverEntry
            res = await serverEntry?.(req)
            if(res) return res;
            return new Response("Not Found", {status: 404})
        }
    })
} 