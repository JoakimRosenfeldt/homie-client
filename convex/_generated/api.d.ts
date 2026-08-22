/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as applications from "../applications.js";
import type * as conversations from "../conversations.js";
import type * as crons from "../crons.js";
import type * as lib_device from "../lib/device.js";
import type * as lib_publishedSearch from "../lib/publishedSearch.js";
import type * as lib_uploads from "../lib/uploads.js";
import type * as lib_validation from "../lib/validation.js";
import type * as lib_validators from "../lib/validators.js";
import type * as listings from "../listings.js";
import type * as moderation from "../moderation.js";
import type * as privacy from "../privacy.js";
import type * as profiles from "../profiles.js";
import type * as savedSearches from "../savedSearches.js";
import type * as seed from "../seed.js";
import type * as trust from "../trust.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  applications: typeof applications;
  conversations: typeof conversations;
  crons: typeof crons;
  "lib/device": typeof lib_device;
  "lib/publishedSearch": typeof lib_publishedSearch;
  "lib/uploads": typeof lib_uploads;
  "lib/validation": typeof lib_validation;
  "lib/validators": typeof lib_validators;
  listings: typeof listings;
  moderation: typeof moderation;
  privacy: typeof privacy;
  profiles: typeof profiles;
  savedSearches: typeof savedSearches;
  seed: typeof seed;
  trust: typeof trust;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
