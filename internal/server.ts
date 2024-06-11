import { Hono } from "jsr:@hono/hono"
import { serveStatic } from "jsr:@hono/hono/deno"

export class Ultra {

    constructor(){
        this.hono.use(serveStatic({ root: "public" }))
        this.hono.use(serveStatic({ root: ".dist" }))
    }

    hono = new Hono()

    get = this.hono.get
    post = this.hono.post
    put = this.hono.put
    delete = this.hono.delete
    use = this.hono.use

    fetch = this.hono.fetch
}