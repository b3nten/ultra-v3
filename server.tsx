import { Ultra } from "./internal/server.ts"
import { asset } from "./internal/asset.ts";

const app = new Ultra()

app.get("/", c => c.html(
    <html lang="en">
        <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
            <script type="module" async src={"/" + asset("client.tsx")?.path}></script>
            <title>Hono</title>
        </head>
        <body>
            <h1>Welcome to Hono</h1>
            <ultra-counter/>
        </body>
    </html>
))

export default app