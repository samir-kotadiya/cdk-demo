import { sync } from 'fast-glob';
import { build } from 'esbuild';
import { rmSync, writeFileSync } from 'fs';

const isLocal = (process.env?.LOCAL?.toLowerCase() ?? 'false') === 'true';
console.log(isLocal);
const external: string[] = ['aws-sdk', 'pg-native'];
if (!isLocal) {
  try {
    // clear previous bundle
    rmSync('dist/bundle', { recursive: true });
  } catch (e) {
    console.info('No previous bundle to delete');
  }
}

build({
  platform: 'node',
  target: 'node14',
  entryPoints: sync('src/**/*-lambda.ts'),
  outdir: 'dist/bundle/',
  bundle: true,
  minify: !isLocal,
  external,
  metafile: !isLocal,
  treeShaking: !isLocal,
  mainFields: ['es2015', 'module', 'main'],
})
  .then((result) => {
    // https://www.bundle-buddy.com/esbuild
    !isLocal &&
      writeFileSync('dist/meta.json', JSON.stringify(result.metafile));
    //prepareCTConfigs();
    //prepareTerminationConfigs();
    console.log('Bundle done');
  })
  .catch((reason) => {
    console.error('Error with bundle process!', reason);
    // force exit so pipeline can stop
    // eslint-disable-next-line no-process-exit
    process.exit(-1);
  });
