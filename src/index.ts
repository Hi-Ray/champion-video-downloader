import axios from 'axios';
import { colorConsole } from 'tracer';
import download from 'download';
import { Command } from 'commander';
import targz from 'targz';

const logger = colorConsole();

// The base path for our champions.
const ChampionBasePath =
    'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champions/{id}.json';

interface options {
    output: string | undefined;
    compress: boolean | undefined;
    champions: string | undefined;
}

async function downloadFiles(options: options) {
    // Check if the user specified an output dir if not default to "./out".
    if (!options.output) {
        logger.warn('The output directory has not been defined. Defaulting to "./out".');
        options.output = './out';
    }

    if (options.champions) {
        const championIds = options.champions.split(',');

        for (let i = 0; i < championIds.length; i++) {
            // Replace the placeholder {id} with the champions ID.
            const champUrl = ChampionBasePath.replace('{id}', championIds[i]);

            const req = await axios.get(champUrl);

            const data = req.data;

            data.spells.forEach(({ abilityVideoPath, name }) => {
                logger.info(`Downloading ${abilityVideoPath}!`);

                if (abilityVideoPath === '') {
                    logger.error(`${name} could not be downloaded, most likely doesn't exist.`);
                    return;
                }

                try {
                    download(
                        `https://d28xe8vt774jo5.cloudfront.net/${abilityVideoPath}`,
                        `${options.output}/${abilityVideoPath.split('/').slice(0, -1).join('/')}`,
                    );
                } catch (e) {
                    logger.error(`${abilityVideoPath} could not be downloaded, most likely doesn't exist.`);
                }

                logger.trace(`Downloaded "${abilityVideoPath}".`);
            });
        }

        return;
    }

    // Get the champion ID's,
    logger.info("Requesting champion ID's from CommunityDragon");
    const championsReq = await axios.get(
        'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-summary.json',
    );

    // Get the list of ID's.
    const championIds: string[] = championsReq.data.map((data) => data.id);

    // Remove the first one(-1) since that isn't a champion.
    championIds.shift();

    for (let i = 0; i < championIds.length; i++) {
        // Replace the placeholder {id} with the champions ID.
        const champUrl = ChampionBasePath.replace('{id}', championIds[i]);

        const req = await axios.get(champUrl);

        const data = req.data;

        data.spells.forEach(({ abilityVideoPath, name }) => {
            logger.info(`Downloading ${abilityVideoPath}!`);

            if (abilityVideoPath === '') {
                logger.error(`${name} could not be downloaded, most likely doesn't exist.`);
                return;
            }

            try {
                download(
                    `https://d28xe8vt774jo5.cloudfront.net/${abilityVideoPath}`,
                    `${options.output}/${abilityVideoPath.split('/').slice(0, -1).join('/')}`,
                );
            } catch (e) {
                logger.error(`${abilityVideoPath} could not be downloaded, most likely doesn't exist.`);
            }

            logger.trace(`Downloaded "${abilityVideoPath}".`);
        });
    }

    // Compress the videos into a tarball
    if (options.compress) {
        targz.compress(
            {
                src: options.output + '/champion-abilities',
                dest: options.output + '/champion-abilities.tar.gz',
            },
            function (err) {
                if (err) {
                    logger.error(err);
                } else {
                    logger.info('Successfully created compressed files!');
                }
            },
        );
    }
}

const program = new Command()
    .option('-o, --output <output>', 'Output directory location. Default is "./out".')
    .option('-C --compress', 'Compress the final results into a tarball.')
    .option('-c --champions <champion ids>', 'A csv of champions to exclusively download.')
    .action(async (options: options) => await downloadFiles(options))
    .version('1.0.0');

// Parse the CLI
program.parse();
