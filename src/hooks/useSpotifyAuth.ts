import { useEffect, useState } from "react";

import {
  beginSpotifyLogin,
  clearSpotifySession,
  getSpotifyClientId,
  getSpotifyRedirectUri,
  getSpotifyScope,
  loadStoredTokens,
  maybeCompleteSpotifyLogin,
  SPOTIFY_SESSION_CLEARED_EVENT,
  type StoredSpotifyTokens,
} from "../spotify/auth/spotifyAuth";

type SpotifyAuthState = {
  tokens: StoredSpotifyTokens | null;
  isLoading: boolean;
  errorMessage: string | null;
  login: () => Promise<void>;
  logout: () => void;
  scope: string;
};

export function useSpotifyAuth(): SpotifyAuthState {
  const [tokens, setTokens] = useState<StoredSpotifyTokens | null>(() => loadStoredTokens());
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    function handleSessionCleared() {
      setTokens(null);
    }

    window.addEventListener(SPOTIFY_SESSION_CLEARED_EVENT, handleSessionCleared);

    async function initializeAuth() {
      try {
        getSpotifyClientId();
        getSpotifyRedirectUri();
        const nextTokens = await maybeCompleteSpotifyLogin();
        if (!isMounted) {
          return;
        }

        setTokens(nextTokens);
        setErrorMessage(null);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setTokens(null);
        setErrorMessage(error instanceof Error ? error.message : "Spotify sign-in failed.");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void initializeAuth();

    return () => {
      isMounted = false;
      window.removeEventListener(SPOTIFY_SESSION_CLEARED_EVENT, handleSessionCleared);
    };
  }, []);

  return {
    tokens,
    isLoading,
    errorMessage,
    scope: getSpotifyScope(),
    async login() {
      setErrorMessage(null);

      try {
        await beginSpotifyLogin();
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Unable to start Spotify sign-in.");
      }
    },
    logout() {
      clearSpotifySession();
      setTokens(null);
      setErrorMessage(null);
    },
  };
}
