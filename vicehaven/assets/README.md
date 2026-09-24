# assets/

Phase 1 needs no asset files: every texture, model and sign in Vicehaven is
generated from code when the game loads, which is also what lets it run from
a `file://` page with no server.

These folders are where optional hand-made assets will go in later phases:

| Folder      | For                                             | Arrives with |
|-------------|-------------------------------------------------|--------------|
| `models/`   | glTF vehicles, props or characters              | optional, any phase |
| `textures/` | image textures that replace procedural ones     | optional     |
| `audio/`    | recorded sound effects or music                 | Phase 19 (sound is synthesised by default) |
| `fonts/`    | a bundled display font                          | Phase 21 polish |

Note for `file://` use: Edge does not let WebGL read image files from a local
folder (they count as a different origin). Anything placed here must also
work when the game is opened by double-clicking `index.html`, so loaders in
later phases fall back to the procedural versions when a file can't be read.
