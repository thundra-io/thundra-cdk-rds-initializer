import type {Config} from '@jest/types';
// Sync object
const config: Config.InitialOptions = {
    testTimeout: 600000,
    verbose: true,
    testPathIgnorePatterns: ['.d.ts', '.js'],
    transform: {
        '^.+\\.tsx?$': 'ts-jest',
    },
};
export default config;
