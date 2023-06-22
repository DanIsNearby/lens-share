import { ProfileFragment } from "@lens-protocol/client";
import truncateMarkdown from "markdown-truncate";
import { ResolvingMetadata } from "next";
import { notFound } from "next/navigation";

import { client } from "@/app/client";
import { SearchParams, SelectionMode } from "@/app/types";
import { AppRadioOption } from "@/components/AppRadioOption";
import { twitterHandle } from "@/config";
import { AppManifest, findApp, findFavoriteApp, findProfileApps } from "@/data";
import { formatProfileHandle } from "@/formatters";
import { resolvePlatformType } from "@/utils/device";
import { resolveAttribution } from "@/utils/request";

import { openWith } from "./actions";
import { redirectTo } from "./redirect";

export type ProfilePageProps = {
  params: {
    handle: string;
  };
  searchParams: SearchParams;
};

export default async function ProfilePage({ params, searchParams }: ProfilePageProps) {
  const platform = resolvePlatformType();
  const profile = await client.profile.fetch({ handle: params.handle });

  const favoriteApp = await findFavoriteApp({ platform });

  if (favoriteApp) {
    redirectTo(favoriteApp, params.handle);
  }

  if (!profile) notFound();

  const attribution = searchParams.by ? await findApp({ appId: searchParams.by, platform }) : null;

  const options = await findProfileApps({
    platform,
    exclude: attribution?.appId,
  });

  return (
    <div className="fixed inset-0 flex items-end justify-center">
      <form
        action={openWith}
        className="bg-darkDandelion rounded-t-lg overflow-hidden shadow-lg w-full sm:w-auto"
      >
        <input type="hidden" name="handle" value={profile.handle} />

        <div className="p-4">
          <h2 className="text-xl font-bold mb-4">
            {`Open ${formatProfileHandle(profile.handle)} profile with:`}
          </h2>

          {attribution && (
            <>
              <div className="p-2 space-y-2" data-testid="attribution">
                <AppRadioOption app={attribution} />
              </div>
              {options.length > 0 && <p>or use:</p>}
            </>
          )}

          {options.length > 0 && (
            <ul className="space-y-2">
              {options.map((app) => (
                <li key={app.appId} className="flex items-center px-2">
                  <AppRadioOption app={app} />
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="bg-gray-100 dark:bg-slate-700 p-4 flex justify-end gap-4">
          <button
            className="text-gray-800 dark:text-white font-medium uppercase transform"
            name="mode"
            value={SelectionMode.Always}
          >
            Always
          </button>
          <button
            className="text-gray-800 dark:text-white font-medium uppercase transform"
            name="mode"
            value={SelectionMode.JustOnce}
          >
            Just Once
          </button>
        </div>
      </form>
    </div>
  );
}

function formatPageTitle(profile: ProfileFragment, attribution: AppManifest | null) {
  if (attribution) {
    return `${formatProfileHandle(profile.handle)} profile  • ${attribution.name}`;
  }
  return `${formatProfileHandle(profile.handle)} profile`;
}

function formatPageDescription(profile: ProfileFragment) {
  return profile.bio
    ? truncateMarkdown(profile.bio, {
        limit: 100,
        ellipsis: true,
      })
    : undefined;
}

export async function generateMetadata(
  { params, searchParams }: ProfilePageProps,
  parent: ResolvingMetadata
) {
  const profile = await client.profile.fetch({ handle: params.handle });

  if (!profile) notFound();

  const attribution = await resolveAttribution(searchParams);

  const title = formatPageTitle(profile, attribution);

  const description = formatPageDescription(profile);

  const { openGraph } = await parent;
  const siteName = attribution?.name ?? openGraph?.siteName ?? undefined;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `/u/${profile.handle}`,
      type: "profile",
      siteName,
    },
    twitter: {
      title,
      description,
      card: "summary_large_image",
      site: attribution?.twitter ?? twitterHandle,
    },
  };
}
