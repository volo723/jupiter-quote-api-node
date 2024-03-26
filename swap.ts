// import { createJupiterApiClient, IndexedRouteMapResponse } from "../src/index";
import { createJupiterApiClient } from '@jup-ag/api';
import { Connection, Keypair, VersionedTransaction } from "@solana/web3.js";
import { Wallet } from "@project-serum/anchor";
import bs58 from "bs58";

import fetch from 'node-fetch';

import dotenv from 'dotenv';
dotenv.config();

// type RouteMap = Record<string, string[]>;

// function inflateIndexedRouteMap(
//   result: IndexedRouteMapResponse
// ): Record<string, string[]> {
//   const { mintKeys, indexedRouteMap } = result;

//   return Object.entries(indexedRouteMap).reduce<RouteMap>(
//     (acc, [inputMintIndexString, outputMintIndices]) => {
//       const inputMintIndex = Number(inputMintIndexString);
//       const inputMint = mintKeys[inputMintIndex];
//       if (!inputMint)
//         throw new Error(`Could no find mint key for index ${inputMintIndex}`);

//       acc[inputMint] = outputMintIndices.map((index) => {
//         const outputMint = mintKeys[index];
//         if (!outputMint)
//           throw new Error(`Could no find mint key for index ${index}`);

//         return outputMint;
//       });

//       return acc;
//     },
//     {}
//   );
// }

export async function main() {
  try {
    const jupiterQuoteApi = createJupiterApiClient();
    const wallet = new Wallet(
      Keypair.fromSecretKey(bs58.decode(process.env.PRIVATE_KEY || ""))
    );

    // make sure that you are using your own RPC endpoint
    const connection = new Connection(
      // "https://neat-hidden-sanctuary.solana-mainnet.discover.quiknode.pro/2af5315d336f9ae920028bbb90a73b724dc1bbed/"
      "https://muddy-greatest-moon.solana-mainnet.quiknode.pro/6c91fb508ed818340a8622c0b167c2a59dc86187/"
    );

    // get quote
    const quote = await jupiterQuoteApi.quoteGet({
      inputMint: "So11111111111111111111111111111111111111112",
      outputMint: "EAxVKent31nVqJY9iaZdE48j95Rkw1SPErG1EZwdXeRu",
      amount: 10000,
      slippageBps: 100,
      onlyDirectRoutes: false,
      asLegacyTransaction: false,
    });

    if (!quote) {
      console.error("unable to quote");
      return;
    }

    // get serialized transaction
    const swapResult = await jupiterQuoteApi.swapPost({
      swapRequest: {
        quoteResponse: quote,
        userPublicKey: wallet.publicKey.toBase58(),
        dynamicComputeUnitLimit: true,
      },
    });

    console.dir(swapResult, { depth: null });

    // submit transaction
    const swapTransactionBuf = Buffer.from(swapResult.swapTransaction, "base64");
    var transaction = VersionedTransaction.deserialize(swapTransactionBuf);
    console.log(transaction);
    console.log("\n\n TX: \n", JSON.stringify(transaction));

    // sign the transaction
    transaction.sign([wallet.payer]);

    const rawTransaction = transaction.serialize();
    const txid = await connection.sendRawTransaction(rawTransaction, {
      skipPreflight: true,
      maxRetries: 2,
    });
    await connection.confirmTransaction(txid);
    console.log(`https://solscan.io/tx/${txid}`);

    // get route map
    //   const result = await jupiterQuoteApi.indexedRouteMapGet();
    //   const routeMap = inflateIndexedRouteMap(result);
    //   console.log(Object.keys(routeMap).length);

  }
  catch (e) {
    console.log("\n\nException: ", e);
  }
}

main();