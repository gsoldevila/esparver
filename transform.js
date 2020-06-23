const { join } = require('path');
const { readdirSync, statSync, renameSync, mkdirSync, copyFileSync } = require('fs');
const { copySync, removeSync } = require('fs-extra');
const sharp = require('sharp');
const mergeImg = require('merge-img');
const { exit } = require('process');
const [origin, destination] = process.argv.slice(2);

const ROTATE_90 = 270;
const ROTATE_180 = 180;
const ROTATE_270 = 90;

const createGrid = (size) => {
    const grid = [];
    for (i = 0; i < size; ++i) {
        const row = [];
        for (j = 0; j < size; ++j) row.push([i, j]);
        grid.push(row);
    }
    return grid;
};

const rotateRight = (grid) => {
    return grid[0].map((_, i) => grid.map(row => row[i]).reverse());
};

const printGrid = (grid) => {
    grid.forEach(row => console.log(row.join(' | ')));
}

//printGrid(createGrid(16));
//console.log('----')
//printGrid(rotateRight(rotateRight(rotateRight(createGrid(16)))));
//printGrid(rotateRight(createGrid(16)));
//exit(0);

const findRotatedIndexs = (row, col, size, mode) => {
    const grid = createGrid(size);
    switch(mode) {
        case ROTATE_90:
            return rotateRight(grid)[row][col];
        case ROTATE_180:
            return rotateRight(rotateRight(grid))[row][col];
        case ROTATE_270:
            return rotateRight(rotateRight(rotateRight(grid)))[row][col];
        default:
            return grid[row][col];
    }
};

const copyRotate = (orig, dest, mode) => {
    const rows = readdirSync(orig).filter(f => statSync(join(orig, f)).isDirectory());
    const size = rows.length;

    rows.forEach(row => {
        readdirSync(join(orig, row)).forEach(img => {
            const col = img.substring(0, img.length - 4);
            const [i, j] = findRotatedIndexs(row, +col, size, mode);
            const destFolder = join(dest, `${i}`);
            mkdirSync(destFolder, { recursive: true });
            sharp(join(orig, row, img)).rotate(mode).toFile(join(destFolder, `${j}.jpg`));
        });
    });
};

readdirSync(origin)
    .filter(f => statSync(join(origin, f)).isDirectory())
    .forEach(zoomLevelFolder => {
        const dZoomLevelFolder = join(destination, zoomLevelFolder);
        mkdirSync(dZoomLevelFolder, { recursive: true });

        // back => 180º => up
        copyRotate(join(origin, zoomLevelFolder, 'b'), join(dZoomLevelFolder, 'u'), ROTATE_180);

        // down => back
        copyRotate(join(origin, zoomLevelFolder, 'd'), join(dZoomLevelFolder, 'b'), ROTATE_180);

        // front => 180º => down
        copySync(join(origin, zoomLevelFolder, 'f'), join(dZoomLevelFolder, 'd'));

        // left => 90º CW => left
        copyRotate(join(origin, zoomLevelFolder, 'l'), join(dZoomLevelFolder, 'l'), ROTATE_270);

        // right => 90º CCW => right
        copyRotate(join(origin, zoomLevelFolder, 'r'), join(dZoomLevelFolder, 'r'), ROTATE_90);

        // up => front
        copySync(join(origin, zoomLevelFolder, 'u'), join(dZoomLevelFolder, 'f'));
    });

mergeImg(
    [
        join(destination, '1', 'b', '0', '0.jpg'),
        join(destination, '1', 'd', '0', '0.jpg'),
        join(destination, '1', 'f', '0', '0.jpg'),
        join(destination, '1', 'l', '0', '0.jpg'),
        join(destination, '1', 'r', '0', '0.jpg'),
        join(destination, '1', 'u', '0', '0.jpg'),
    ],
    { direction: true }
).then(img => img.write(join(destination, 'preview.jpg')));
