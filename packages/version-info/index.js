import { existsSync } from 'node:fs';
import { join, parse } from 'node:path';
import { cwd } from 'node:process';
import { readFile } from 'node:fs/promises';

// 특정 파일을 찾기 위한 함수
const findFile = (file) => {
    let dir = cwd();

    while (dir !== parse(dir).root) {
        if (existsSync(join(dir, file))) {
            return dir;
        }
        dir = join(dir, '../');
    }
    return null;
}

const root = findFile('.git');
const pack = findFile('package.json');

// .git 파일을 읽는 함수
const readGit = async (filename) => {
    if (!root) {
        throw new Error('no git repository root found');
    }

    return readFile(join(root, filename), 'utf8');
}

// 커밋 해시 가져오기
export const getCommit = async () => {
    // 환경 변수 사용
    if (process.env.COMMIT_HASH) {
        return process.env.COMMIT_HASH;
    }

    // 개발 환경에서만 .git 접근
    if (!root) {
        console.warn('no git repository root found. Using default commit hash.');
        return 'unknown';
    }

    try {
        const logs = await readGit('.git/logs/HEAD');
        const lastLog = logs.split('\n').filter(Boolean).pop();
        return lastLog?.split(' ')[1] || 'unknown';
    } catch (error) {
        console.error('Error reading commit hash:', error);
        return 'unknown';
    }
}

// 브랜치 이름 가져오기
export const getBranch = async () => {
    // 환경 변수 사용
    if (process.env.BRANCH_NAME) {
        return process.env.BRANCH_NAME;
    }

    // 개발 환경에서만 .git 접근
    if (!root) {
        console.warn('no git repository root found. Using default branch name.');
        return 'main';
    }

    try {
        const head = await readGit('.git/HEAD');
        return head.replace(/^ref: refs\/heads\//, '').trim();
    } catch (error) {
        console.error('Error reading branch name:', error);
        return 'main';
    }
}

// 원격 저장소 URL 가져오기
export const getRemote = async () => {
    // 환경 변수 사용
    if (process.env.REPO_URL) {
        let remote = process.env.REPO_URL;

        if (remote.startsWith('git@')) {
            remote = remote.split(':')[1];
        } else if (remote.startsWith('http')) {
            remote = new URL(remote).pathname.substring(1);
        }

        remote = remote.replace(/\.git$/, '');

        if (!remote) {
            throw new Error('could not parse remote from REPO_URL');
        }

        return remote;
    }

    // 개발 환경에서만 .git 접근
    if (!root) {
        throw new Error('no git repository root found and REPO_URL environment variable is not set.');
    }

    try {
        let remote = (await readGit('.git/config'))
            .split('\n')
            .find(line => line.includes('url = '))
            .split('url = ')[1]
            .trim();

        if (remote.startsWith('git@')) {
            remote = remote.split(':')[1];
        } else if (remote.startsWith('http')) {
            remote = new URL(remote).pathname.substring(1);
        }

        remote = remote.replace(/\.git$/, '');

        if (!remote) {
            throw new Error('could not parse remote');
        }

        return remote;
    } catch (error) {
        console.error('Error reading remote URL:', error);
        throw new Error('could not parse remote');
    }
}

// 버전 정보 가져오기
export const getVersion = async () => {
    // 환경 변수 사용
    if (process.env.VERSION) {
        return process.env.VERSION;
    }

    // package.json 접근
    if (!pack) {
        throw new Error('no package root found');
    }

    try {
        const { version } = JSON.parse(
            await readFile(join(pack, 'package.json'), 'utf8')
        );

        return version;
    } catch (error) {
        console.error('Error reading version from package.json:', error);
        return 'unknown';
    }
}
