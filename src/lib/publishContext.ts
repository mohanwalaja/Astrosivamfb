import { createContext, useContext } from "react";
import type { Platform } from "./imageValidate";

export type PlatformCaptions = Record<Platform, string>;

/** A rendered single-image post plus its platform-specific, editable copy. */
export interface PublisherDraft {
  file: File;
  captions: PlatformCaptions;
  /** Facebook + Instagram by default when the Page has a linked IG account. */
  platforms?: Platform[];
  /** A design-surface button is explicit intent to publish immediately. */
  autoPublish?: boolean;
  sourceLabel: string;
}

export type OpenPublisher = (draft?: PublisherDraft) => void;

const PublishContext = createContext<OpenPublisher>(() => undefined);

export const PublishContextProvider = PublishContext.Provider;
export const useOpenPublisher = () => useContext(PublishContext);
