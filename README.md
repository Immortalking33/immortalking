# crosswatch_backend
The backend is a nodejs application, so to start it, you need an installation of nodejs. Then it's just
```
    nodejs server.js
```

By default, the server runs on port 3000. It reads the PORT environment variable, so you can set a different port by, for example
```
    PORT=4000 nodejs server.js
```

The port needs to be open, and participants need to set the server location (and port) in the extension options.

At the moment, I am not running a server meant for public use, so you will have to sort this out with the group that you're watching with.
