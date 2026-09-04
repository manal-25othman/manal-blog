import type { Metadata } from "next";

import { JsonLd } from "@/components/json-ld";
import { MarkdownPage, buildPageMetadata } from "@/components/markdown-page";
import { absoluteUrl, configuredProfiles, siteConfig } from "@/config/site";
import { getAuthor } from "@/lib/site-copy";

export function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata("about");
}

export default function AboutPage() {
  const person = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: getAuthor().name,
    jobTitle: getAuthor().role,
    description: getAuthor().bio,
    url: absoluteUrl("/about"),
    // حقل فارغ في البيانات المهيكلة أسوأ من غيابه — لا نُصرّح ببريد غير مضبوط.
    ...(siteConfig.email ? { email: siteConfig.email } : {}),
    ...(configuredProfiles().length ? { sameAs: configuredProfiles() } : {}),
    worksFor: { "@type": "Organization", name: siteConfig.name, url: siteConfig.url },
  };

  return (
    <>
      <MarkdownPage slug="about">
        <h2>من يكتب</h2>
        <p>
          <strong>{getAuthor().name}</strong> — {getAuthor().role}. {getAuthor().bio}
        </p>
      </MarkdownPage>
      <JsonLd data={person} />
    </>
  );
}
