const fs = require("fs");
const path = require("path");

function ensureTmpDirs(tmpDir, uploadMap) {
    for (const cfg of Object.values(uploadMap)) {
        fs.mkdirSync(path.join(tmpDir, cfg.tmpSubDir), {recursive: true});
    }
}

function isImage(filename) {
    return /\.(png|jpe?g|gif|webp)$/i.test(filename);
}

function findTmpUpload(dir, uploadId) {
    if (!fs.existsSync(dir)) return null;

    const files = fs.readdirSync(dir);
    return files.find((file) => file.startsWith(uploadId)) || null;
}

function deleteUserImage(dir, baseName) {
    if (!fs.existsSync(dir)) return;

    const files = fs.readdirSync(dir);
    for (const file of files) {
        if (file.startsWith(`${baseName}.`)) {
            fs.unlinkSync(path.join(dir, file));
        }
    }
}

function cleanupDeletedEntityImages({
    oldSections,
    newSections,
    getIds,
    imageDir
}) {
    const oldIds = new Set();
    oldSections.forEach((section) => {
        getIds(section).forEach((id) => oldIds.add(id));
    });

    const newIds = new Set();
    newSections.forEach((section) => {
        getIds(section).forEach((id) => newIds.add(id));
    });

    for (const id of oldIds) {
        if (!newIds.has(id)) {
            deleteUserImage(imageDir, id);
        }
    }
}

function commitImage({
    image,
    uploadDir,
    targetDir,
    targetBaseName
}) {
    if (image && image._delete === true) {
        deleteUserImage(targetDir, targetBaseName);
        return;
    }

    if (!image?.uploadId) {
        return;
    }

    const tmpFile = findTmpUpload(uploadDir, image.uploadId);
    if (!tmpFile) return;

    fs.mkdirSync(targetDir, {recursive: true});
    deleteUserImage(targetDir, targetBaseName);

    const ext = path.extname(tmpFile);
    const target = path.join(targetDir, targetBaseName + ext);
    const src = path.join(uploadDir, tmpFile);

    fs.copyFileSync(src, target);
    fs.unlinkSync(src);
    return target;
}

module.exports = {
    ensureTmpDirs,
    isImage,
    cleanupDeletedEntityImages,
    commitImage
};
