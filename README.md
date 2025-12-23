# Cubik 3D Builder – Package layout

This build is prepared for **stable relative paths**:

- `index.html` is in the repository / deploy root
- all other assets live under `/3dbuilder/`

## Folder structure

```
/index.html
/3dbuilder/
  /css/
    styles.css
  /js/
    app.js
    autosave.js
    history.js
    i18n.js
    io.js
    loader.js
    mobile.js
    renderer.js
    ui.js
    utils.js
  /icons/   (keep exact folder name + case)
  /models/  (keep exact folder name + case)
  /Video/   (keep exact folder name + case)
```

## Where to put your assets

### Models
Put your OBJ files here:

`/3dbuilder/models/`

Required filenames (case-sensitive on Linux hosting):

- `Void.obj`
- `Zen.obj`
- `Bion.obj`
- `Zen_2.obj`

### Mobile placeholder video
Put the video here:

`/3dbuilder/Video/Plug.mp4`

### Icons
Put all UI icons here:

`/3dbuilder/icons/`

The HTML references the icon filenames directly, so keep names unchanged.

## Notes

- All runtime asset URLs (icons/models/video) are resolved relative to `index.html`,
  therefore they must include the `/3dbuilder/...` prefix (already applied in this package).
