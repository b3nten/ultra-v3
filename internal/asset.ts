type Metafile = Record<string, {path: string, imports: Array<{path: string, kind: string}>}>

export const metafile: Metafile | undefined = globalThis.Ultra.metafile

export const asset = (path: string): Metafile | undefined => {
    return globalThis.Ultra.metafile?.[path]
}