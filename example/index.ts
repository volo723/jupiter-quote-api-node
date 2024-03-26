import { createJupiterApiClient, IndexedRouteMapResponse, QuoteResponse } from "../src/index";
import { Connection, Keypair, VersionedTransaction } from "@solana/web3.js";
import { Wallet } from "@project-serum/anchor";
import bs58 from "bs58";
import axios from 'axios'

// import fetch from "node-fetch";

// require('dotenv').config()

type RouteMap = Record<string, string[]>;

function inflateIndexedRouteMap(
  result: IndexedRouteMapResponse
): Record<string, string[]> {
  const { mintKeys, indexedRouteMap } = result;

  return Object.entries(indexedRouteMap).reduce<RouteMap>(
    (acc, [inputMintIndexString, outputMintIndices]) => {
      const inputMintIndex = Number(inputMintIndexString);
      const inputMint = mintKeys[inputMintIndex];
      if (!inputMint)
        throw new Error(`Could no find mint key for index ${inputMintIndex}`);

      acc[inputMint] = outputMintIndices.map((index) => {
        const outputMint = mintKeys[index];
        if (!outputMint)
          throw new Error(`Could no find mint key for index ${index}`);

        return outputMint;
      });

      return acc;
    },
    {}
  );
}

export async function main() {
  const jupiterQuoteApi = createJupiterApiClient();
  const wallet = new Wallet(
    Keypair.fromSecretKey(bs58.decode("tbkjbMLDjxVKjVRCN13U17N156UvDMxPR1ScPAJQgkFjQ1PjWYYRNqDNA6SzEZaapRziE7kkvMZbC1SmBzsBnNG"))
    // Keypair.fromSecretKey(bs58.decode(process.env.PRIVATE_KEY || ""))
  );

  console.log("quote = 0");
  // make sure that you are using your own RPC endpoint
  const connection = new Connection(
    "https://muddy-greatest-moon.solana-mainnet.quiknode.pro/6c91fb508ed818340a8622c0b167c2a59dc86187/"
    // "https://neat-hidden-sanctuary.solana-mainnet.discover.quiknode.pro/2af5315d336f9ae920028bbb90a73b724dc1bbed/"
  );

  console.log("quote = 1");

  // const res = await axios.get("https://quote-api.jup.ag/v6/quote?inputMint=So11111111111111111111111111111111111111112&outputMint=WENWENvqqNya429ubCdR81ZmD69brwQaaBYY6p3LCpk&amount=1000000&slippageBps=1")
  // const quote: any = res.data;
  
  // get quote
  const quote = await jupiterQuoteApi.quoteGet({
    inputMint: "So11111111111111111111111111111111111111112",
    outputMint: "WENWENvqqNya429ubCdR81ZmD69brwQaaBYY6p3LCpk",
    amount: 10000,
    slippageBps: 100,
    onlyDirectRoutes: false,
    asLegacyTransaction: false,
  });

  console.log("quote = ", quote);

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
  const result = await jupiterQuoteApi.indexedRouteMapGet();
  const routeMap = inflateIndexedRouteMap(result);
  console.log(Object.keys(routeMap).length);
}

main();
