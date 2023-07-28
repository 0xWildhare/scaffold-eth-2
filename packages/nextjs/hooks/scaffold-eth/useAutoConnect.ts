import { useEffect } from "react";
import { useLocalStorage } from "./useLocalStorage";
import { useEffectOnce, useReadLocalStorage } from "usehooks-ts";
import { Connector, useAccount, useConnect } from "wagmi";
import { hardhat } from "wagmi/chains";
import scaffoldConfig from "~~/scaffold.config";
import { burnerWalletId, defaultBurnerChainId } from "~~/services/web3/wagmi-burner/BurnerConnector";
import { getTargetNetwork } from "~~/utils/scaffold-eth";

const walletIdStorageKey = "scaffoldEth2.wallet";

/**
 * This function will get the initial wallet connector (if any), the app will connect to
 * @param previousWalletId
 * @param connectors
 * @returns
 */
const getInitialConnector = (
  previousWalletId: string,
  connectors: Connector[],
): { connector: Connector | undefined; chainId?: number } | undefined => {
  const burnerConfig = scaffoldConfig.onlyLocalBurnerWallet;
  const targetNetwork = getTargetNetwork();

  const allowBurner = burnerConfig ? targetNetwork.id === hardhat.id : true;

  if (!previousWalletId) {
    // The user was not connected to a wallet
    if (allowBurner && scaffoldConfig.walletAutoConnect) {
      const connector = connectors.find(f => f.id === burnerWalletId);
      return { connector, chainId: defaultBurnerChainId };
    }
  } else {
    // the user was connected to wallet
    if (scaffoldConfig.walletAutoConnect) {
      if (previousWalletId === burnerWalletId && !allowBurner) {
        return;
      }

      const connector = connectors.find(f => f.id === previousWalletId);
      return { connector };
    }
  }

  return undefined;
};

/**
 * Automatically connect to a wallet/connector based on config and prior wallet
 */
export const useAutoConnect = (): void => {
  const wagmiWalletValue = useReadLocalStorage<string>("wagmi.wallet");
  console.log("WagmiWalletValue", wagmiWalletValue);
  const [walletId, setWalletId] = useLocalStorage<string>(walletIdStorageKey, wagmiWalletValue ?? "");
  const connectState = useConnect();
  const accountState = useAccount();

  useEffect(() => {
    console.log("WalletID", walletId);
    console.log("Account State, accountState", accountState);
    if (accountState.isConnected) {
      // user is connected, set walletName
      setWalletId(accountState.connector?.id ?? "");
    } else {
      // user has disconnected, reset walletName
      console.log("Will be emptying localSTorage....");
      window.localStorage.setItem("wagmi.wallet", "");
      setWalletId("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountState.isConnected, accountState.connector?.name]);

  useEffectOnce(() => {
    const initialConnector = getInitialConnector(walletId, connectState.connectors);
    console.log("initialConnector ", initialConnector, "WalletID IS ---", walletId);

    if (initialConnector?.connector) {
      connectState.connect({ connector: initialConnector.connector, chainId: initialConnector.chainId });
    }
  });
};
