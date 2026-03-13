const fs = require('fs');
const path = require('path');

jest.mock('fs');
jest.mock('../lib/paths', () => ({
    USER_ASSETS: '/mock/user-assets',
    APP_ASSETS: '/mock/app-assets'
}));

function findImageById({ rootPath, baseDir, id }) {
    for (const ext of IMAGE_EXTS) {
        const file = `${id}.${ext}`;
        const fullPath = path.join(rootPath, baseDir, file);
        if (fs.existsSync(fullPath)) {
            return { file };
        }
    }
    return null;
}


const {
    resolveServiceCardImage,
    resolveSectionCardImage,
    resolveSectionBackgroundImage
} = require('../lib/image-resolver');

const CASES = [
    {
        name: 'service card',
        resolver: resolveServiceCardImage,
        baseDir: 'cards/services'
    },
    {
        name: 'section card',
        resolver: resolveSectionCardImage,
        baseDir: 'cards/sections'
    },
    {
        name: 'section background',
        resolver: resolveSectionBackgroundImage,
        baseDir: 'backgrounds'
    }
];

describe('image-resolver – entity images', () => {

    beforeEach(() => {
        fs.existsSync.mockReset();
    });

    test.each(CASES)('$name – explicit image wins (src)', ({ resolver }) => {
        const result = resolver({
            id: 'test-id',
            cardImage: { src: '/custom/image.png' },
            backgroundImage: { src: '/custom/image.png' }
        });

        expect(result).toEqual({
            src: '/custom/image.png',
            source: 'explicit',
            isCustom: true
        });
    });

    test.each(CASES)('$name – explicit image wins (uploadId)', ({ resolver }) => {
        const result = resolver({
            id: 'test-id',
            cardImage: { uploadId: 'abc123' },
            backgroundImage: { uploadId: 'abc123' }
        });

        expect(result).toMatchObject({
            uploadId: 'abc123',
            source: 'explicit',
            isCustom: true
        });
    });

    test.each(CASES)('$name – user asset by id has priority', ({ resolver, baseDir }) => {
        const expectedPath = path.normalize(
            `/mock/user-assets/${baseDir}/test-id.png`
        );

        fs.existsSync.mockImplementation(p =>
            path.normalize(p) === expectedPath
        );

        const result = resolver({ id: 'test-id' });

        expect(result).toMatchObject({
            src: `/assets/${baseDir}/test-id.png`,
            source: 'id',
            isCustom: true
        });
    });

    test.each(CASES)('$name – app asset used if user asset missing', ({ resolver, baseDir }) => {
        const expectedPath = path.normalize(
            `/mock/app-assets/${baseDir}/test-id.png`
        );

        fs.existsSync.mockImplementation(p =>
            path.normalize(p) === expectedPath
        );

        const result = resolver({ id: 'test-id' });

        expect(result).toMatchObject({
            src: `/assets/${baseDir}/test-id.png`,
            source: 'app',
            isCustom: false
        });
    });

    test.each(CASES)('$name – fallback to default image', ({ resolver, baseDir }) => {
        fs.existsSync.mockReturnValue(false);

        const result = resolver({ id: 'test-id' });

        expect(result).toEqual({
            src: `/assets/${baseDir}/_default.png`,
            resolvedFile: '_default.png',
            source: 'default',
            isCustom: false
        });
    });

    test.each(CASES)('$name – works without id', ({ resolver }) => {
        fs.existsSync.mockReturnValue(false);

        const result = resolver({});

        expect(result.source).toBe('default');
    });

});
describe('image-resolver – app images', () => {

    beforeEach(() => {
        fs.existsSync.mockReset();
    });

    test.each([
        { name: 'service card', baseDir: 'cards/services' },
        { name: 'section card', baseDir: 'cards/sections' },
        { name: 'section background', baseDir: 'backgrounds' }
    ])('$name – resolves app image by id', ({ baseDir }) => {

        const expectedPath = path.normalize(
            `/mock/app-assets/${baseDir}/test-id.png`
        );

        fs.existsSync.mockImplementation(p =>
            path.normalize(p) === expectedPath
        );

        const result = require('../lib/image-resolver').resolveAppImage({
            id: 'test-id',
            baseDir
        });

        expect(result).toEqual({
            src: `/assets/${baseDir}/test-id.png`,
            resolvedFile: 'test-id.png',
            source: 'app'
        });
    });

    test.each([
        { name: 'service card', baseDir: 'cards/services' },
        { name: 'section card', baseDir: 'cards/sections' },
        { name: 'section background', baseDir: 'backgrounds' }
    ])('$name – falls back to default if app image missing', ({ baseDir }) => {

        fs.existsSync.mockReturnValue(false);

        const result = require('../lib/image-resolver').resolveAppImage({
            id: 'test-id',
            baseDir
        });

        expect(result).toEqual({
            src: `/assets/${baseDir}/_default.png`,
            resolvedFile: '_default.png',
            source: 'app'
        });
    });

});
