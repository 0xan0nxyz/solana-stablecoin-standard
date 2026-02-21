import { Command } from "commander";
import { Keypair, PublicKey } from "@solana/web3.js";
import { SolanaStablecoin } from "@stbr/sss-sdk";
import { loadKeypair, makeConnection, saveSssConfig } from "../utils/config.js";
import { printSuccess, printError } from "../utils/output.js";

export function registerInit(program: Command): void {
  program
    .command("init")
    .description("Deploy a new stablecoin (SSS-1 or SSS-2)")
    .requiredOption("--name <name>", "Token name (max 32 chars)")
    .requiredOption("--symbol <symbol>", "Token symbol (max 10 chars)")
    .option("--preset <preset>", "Preset: sss-1 (default) or sss-2", "sss-1")
    .option("--decimals <n>", "Decimal places (default 6)", "6")
    .option("--uri <uri>", "Metadata URI", "")
    .option("--mint-keypair <path>", "Path to fresh mint keypair JSON (auto-generated if omitted)")
    .action(async (opts, cmd) => {
      const globalOpts = cmd.parent!.opts() as { cluster: string; keypair?: string; json: boolean };
      try {
        const connection = makeConnection(globalOpts.cluster);
        const authority = loadKeypair(globalOpts.keypair);
        const mint = opts.mintKeypair
          ? loadKeypair(opts.mintKeypair)
          : Keypair.generate();

        const preset = opts.preset as "sss-1" | "sss-2";
        if (preset !== "sss-1" && preset !== "sss-2") {
          throw new Error(`Unknown preset "${preset}". Use sss-1 or sss-2.`);
        }

        const coin = await SolanaStablecoin.create(connection, authority, mint, {
          name: opts.name as string,
          symbol: opts.symbol as string,
          decimals: parseInt(opts.decimals as string, 10),
          uri: opts.uri as string,
          preset,
        });

        saveSssConfig({ mint: coin.mintAddress.toBase58() });

        printSuccess("Stablecoin deployed", {
          mint: coin.mintAddress.toBase58(),
          config: coin.configAddress.toBase58(),
          preset,
          "saved to": ".sss-config.json",
        });
      } catch (err) {
        printError(err);
      }
    });
}
