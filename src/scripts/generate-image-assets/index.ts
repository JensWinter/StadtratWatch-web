import { checkArgs, parseArgs, printHelpText } from './cli.ts';
import { ImageAssetsWriter } from './image-assets-writer.ts';
import { VotingsImageDataGenerator } from './votings-image-data-generator.ts';
import { ImagesGenerator } from './images-generator.ts';
import { InputDataLoaders } from './input-data-loaders.ts';
import { pushImageAssetsFromEnv } from './push.ts';

const args = parseArgs(Deno.args);

if (args.help) {
  printHelpText();
  Deno.exit(0);
}

checkArgs(args);

const loader = new InputDataLoaders(args.inputDir);
const { registry, sessionsInput } = loader.loadInputData();

const votingsImageDataGenerator = new VotingsImageDataGenerator();
const votingsImageData = votingsImageDataGenerator.generateVotingsImageData(registry, sessionsInput);

const imagesGenerator = new ImagesGenerator();
const votingImages = imagesGenerator.generateVotingImages(votingsImageData);

const assetsWriter = new ImageAssetsWriter(args.outputDir);
assetsWriter.writeImageAssets(votingImages);

if (args.push) {
  await pushImageAssetsFromEnv(args.outputDir, registry.id, { dryRun: args.dryRun });
}

console.log('Done.');
