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
    if (!root) {
        console.log('No git repository found, returning unknown for commit hash');
        return 'unknown';
    }
    try {
        const head = await readFile(join(root, '.git/HEAD'), 'utf8');
        if (head.startsWith('ref: ')) {
            const ref = head.slice(5).trim();
            const hash = await readFile(join(root, '.git', ref), 'utf8');
            return hash.trim();
        }
        return head.trim();
    } catch (error) {
        console.error('Error reading commit hash:', error);
        return 'unknown';
    }
}

// 브랜치 이름 가져오기
export const getBranch = async () => {
    if (process.env.BRANCH_NAME) {
        console.log('Using BRANCH_NAME from env:', process.env.BRANCH_NAME);
        return process.env.BRANCH_NAME;
    }
    
    if (!root) {
        console.warn('No git repository found, using default branch main');
        return 'main';
    }
    
    try {
        const head = await readGit('.git/HEAD');
        const branch = head.replace(/^ref: refs\/heads\//, '').trim();
        console.log('Using branch from git:', branch);
        return branch;
    } catch (error) {
        console.error('Error reading branch name:', error);
        return 'main';
    }
}

// 원격 저장소 URL 가져오기
export const getRemote = async () => {
    if (process.env.REPO_URL) {
        let remote = process.env.REPO_URL;
        console.log('Using REPO_URL from env:', remote);
        
        try {
            if (remote.startsWith('git@')) {
                remote = remote.split(':')[1];
            } else if (remote.startsWith('http')) {
                remote = new URL(remote).pathname.substring(1);
            }
            remote = remote.replace(/\.git$/, '');
            
            if (!remote) {
                console.warn('Failed to parse REPO_URL, using default');
                return 'saxoji/cobalt';
            }
            return remote;
        } catch (error) {
            console.error('Error parsing REPO_URL:', error);
            return 'saxoji/cobalt';
        }
    }

    if (!root) {
        console.log('No git repository found, using default remote');
        return 'saxoji/cobalt';
    }

    try {
        const config = await readGit('.git/config');
        let remote = config
            .split('\n')
            .find(line => line.includes('url = '))
            ?.split('url = ')[1]
            ?.trim();

        if (!remote) {
            console.warn('No remote URL found in git config, using default');
            return 'saxoji/cobalt';
        }

        if (remote.startsWith('git@')) {
            remote = remote.split(':')[1];
        } else if (remote.startsWith('http')) {
            remote = new URL(remote).pathname.substring(1);
        }
        remote = remote.replace(/\.git$/, '');
        
        return remote || 'saxoji/cobalt';
    } catch (error) {
        console.error('Error reading remote URL:', error);
        return 'saxoji/cobalt';
    }
}

// 버전 정보 가져오기
export const getVersion = async () => {
    if (process.env.VERSION) {
        console.log('Using VERSION from env:', process.env.VERSION);
        return process.env.VERSION;
    }

    if (!pack) {
        console.warn('No package.json found, using default version');
        return '10.5.1';
    }

    try {
        const packageJson = await readFile(join(pack, 'package.json'), 'utf8');
        const { version } = JSON.parse(packageJson);
        if (!version) {
            console.warn('No version field in package.json, using default');
            return '10.5.1';
        }
        console.log('Using version from package.json:', version);
        return version;
    } catch (error) {
        console.error('Error reading version:', error);
        return '10.5.1';
    }
}
