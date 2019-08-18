import DirItem from '@/model/DirItem'
import Logger from '@/helpers/Logger';
import {CancellationTokenFactory} from '@/processing/CancellationTokenFactory';
import path from 'path'

const TEST_DIR_PATH = path.normalize(__dirname);

describe('DirItem', () => {

    const tokenFactory = new CancellationTokenFactory();

    beforeAll(() => {
        Logger.setLogLevel(Logger.LEVEL.OFF)
    });

    it('can scan for folders, excluding the start path', async () => {
        let cancellationToken = tokenFactory.newToken(),
            {dirItems, isLimitExceeded} = await DirItem.loadRecursively({path: TEST_DIR_PATH, cancellationToken});

        expect(isLimitExceeded).toBe(false);
        expect(Array.isArray(dirItems)).toBe(true);
        expect(dirItems.find(it => it.path === TEST_DIR_PATH)).toBeFalsy(); // root not included by default
        expect(dirItems.map(it => it.name)).toMatchSnapshot();
    });

    it('can scan for folders, including the start path', async () => {
        let cancellationToken = tokenFactory.newToken(),
            {dirItems, isLimitExceeded} = await DirItem.loadRecursively({path: TEST_DIR_PATH, cancellationToken, includeRootPath: true});

        expect(isLimitExceeded).toBe(false);
        expect(Array.isArray(dirItems)).toBe(true);
        expect(dirItems.find(it => it.path === TEST_DIR_PATH)).toBeInstanceOf(DirItem); // root included
        expect(dirItems.map(it => it.name)).toMatchSnapshot();
    });

    it('can scan for folders with a limit', async () => {
        let cancellationToken = tokenFactory.newToken(),
            {dirItems, isLimitExceeded} = await DirItem.loadRecursively({path: TEST_DIR_PATH, cancellationToken, includeRootPath: true});

        expect(isLimitExceeded).toBe(false);
        const totalUnlimited = dirItems.length;
        expect(totalUnlimited).toBeGreaterThan(2);

        const LIMIT = totalUnlimited - 1;
       
        // limit < # of existing paths
        let retObj = await DirItem.loadRecursively({path: TEST_DIR_PATH, cancellationToken, includeRootPath: true, limit: LIMIT});
        expect(retObj.dirItems.length).toBe(LIMIT);
        expect(retObj.isLimitExceeded).toBe(true);

        // limit === # of existing paths
        retObj = await DirItem.loadRecursively({path: TEST_DIR_PATH, cancellationToken, includeRootPath: true, limit: totalUnlimited});
        expect(retObj.dirItems.length).toBe(totalUnlimited);
        expect(retObj.isLimitExceeded).toBe(false); // limit is reached, but not exceeded
    });

    it('can be interrupted scanning for folders via cancellationToken', async () => {
        let cancellationToken = tokenFactory.newToken();
        cancellationToken.cancel();
        let {dirItems, isLimitExceeded} = await DirItem.loadRecursively({path: TEST_DIR_PATH, cancellationToken});

        expect(isLimitExceeded).toBe(false);
        expect(Array.isArray(dirItems)).toBe(true);
        expect(dirItems.length).toBe(0);
    });
    
    it('determines the depth of each folder', async () => {
        let cancellationToken = tokenFactory.newToken(),
            {dirItems, isLimitExceeded} = await DirItem.loadRecursively({path: TEST_DIR_PATH, cancellationToken, includeRootPath: true});
        
        expect(dirItems.length).toBeGreaterThan(1);
        const rootDepth = dirItems[0].depth;
        expect(rootDepth).toBeGreaterThan(1);
        
        for (let i = 1; i < dirItems.length; i++) {
            expect(dirItems[i].depth).toBeGreaterThan(rootDepth);
        }
        
        expect(dirItems.find(it => it.name === 'subdir').depth).toBe(rootDepth + 2);
    });
});
