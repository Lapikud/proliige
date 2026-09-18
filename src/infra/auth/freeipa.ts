import {
  FreeipaStrategy,
  allValues,
  firstValue,
  type FreeipaUser,
  type PassportRequest,
} from "@topsinoty/passport-freeipa";
import { env } from "~/env.config";
import type { AuthenticationPort, AuthenticationResult } from "~/core/ports/auth";
import { logger } from "~/lib/logging/server";

export function createFreeipaAuthentication(): AuthenticationPort {
  return {
    authenticate(username, password) {
      return new Promise<AuthenticationResult>((resolve, reject) => {
        const strategy = new FreeipaStrategy({
          freeipa: {
            server: env.FREEIPA_SERVER,
            ...(env.FREEIPA_CLIENT_VERSION === undefined
              ? {}
              : { clientVersion: env.FREEIPA_CLIENT_VERSION }),
            timeout: env.FREEIPA_TIMEOUT_MS,
          },
        });

        strategy.success = (user: FreeipaUser) => {
          const identity = toIdentity(user);
          if (identity === null) {
            logger.warn("auth.freeipa_identity_missing_attributes", {
              username,
              returnedAttributes: Object.keys(user),
            });
            resolve({
              ok: false,
              reason: "Your FreeIPA account is missing required attributes.",
            });

            return;
          }
          resolve({
            ok: true,
            identity,
          });
        };

        strategy.fail = (challenge: unknown, status: number) => {
          logger.warn("auth.freeipa_rejected", {
            username,
            status,
            challenge,
          });
          resolve({
            ok: false,
            reason: describeChallenge(challenge),
          });
        };

        strategy.error = (error: Error) => {
          logger.error("auth.freeipa_error", error, {
            username,
            server: env.FREEIPA_SERVER,
            clientVersion: env.FREEIPA_CLIENT_VERSION ?? "2.156 (library default)",
            timeoutMs: env.FREEIPA_TIMEOUT_MS,
          });
          reject(error);
        };

        const request: PassportRequest = {
          body: {
            username,
            password,
          },
        };
        strategy.authenticate(request);
      });
    },
  };
}

function toIdentity(user: FreeipaUser) {
  const ipaUniqueId = firstValue(user, "ipauniqueid");
  const uid = firstValue(user, "uid");
  if (ipaUniqueId === null || uid === null) {
    return null;
  }

  const displayName =
    firstValue(user, "displayname") ??
    firstValue(user, "cn") ??
    firstValue(user, "givenname") ??
    uid;

  return {
    ipaUniqueId,
    uid,
    displayName,

    groups: allValues(user, "memberof_group"),
  };
}

function describeChallenge(challenge: unknown): string {
  if (typeof challenge === "string") {
    return challenge;
  }
  if (
    typeof challenge === "object" &&
    challenge !== null &&
    "message" in challenge &&
    typeof challenge.message === "string"
  ) {
    return challenge.message;
  }

  return "Incorrect username or password.";
}
