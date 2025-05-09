// Copyright 2024 Mention Ads. All rights reserved.
// Use of this source code is governed by the PolyForm Shield 1.0.0 license
// that can be found in the LICENSE.md file at the root of this repository.

//#region codes
// E00: The script is already running.
// E10: The network or backend had an issue.
// E20: The rewrite is not a prefix or a suffix of the original text.
// E30: The text does not exist in the HTML node, even after concatenation.
// E40: The beacon was not queued, thus instrumentation failed.
//#endregion

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface Window { mentionads?: boolean; }

(function () {
  const name = "Mention Ads";
  const version = "1.0.3";
  console.info(name, `v${version}`, "https://www.mentionads.com/changelog");

  if (window.mentionads) {
    console.warn(name, "E00", "The script is already running.");
    return;
  }
  window.mentionads = true;

  const { body, location: { hash, host } } = document;
  const script = document.querySelector("script[src^='https://cdn.mentionads.com']");
  const domain = script?.getAttribute("data-domain") ?? host;
  const config = script?.getAttribute("data-config")
    ?? body?.getAttribute("data-mentionads")
    ?? "";
  const debug = hash.includes("mentionads=debug") || config.includes("debug");
  const demo = hash.includes("mentionads=demo") || config.includes("demo");
  const cache = !hash.includes("mentionads=cacheoff") && !config.includes("cacheoff");

  const magicURL = "https://api.mentionads.com/v1/magic";
  const clickURL = "https://api.mentionads.com/v1/click";
  const attribute = "data-mentionads";

  const utf8JSON = "application/json;charset=utf-8";
  const space = " ";

  const jaccardThreshold = 0.8;

  //#region interfaces
  // https://api.mentionads.com/spec
  // https://api.mentionads.com/spec.json
  interface IRequestBody {
    version: string;
    domain: string;
    body: string;
    texts?: string[];
    cache?: boolean;
  };
  interface IRewrite {
    from: string;
    to: string;
  };
  interface IMention {
    substring: string;
    title: string;
    url: string;
    alt?: string;
  };
  interface IResponseBody {
    success: boolean;
    rewrites: IRewrite[],
    mentions: IMention[],
  };
  //#endregion
  const defaultResponseBody = (): IResponseBody => ({
    success: false,
    rewrites: [],
    mentions: [],
  });

  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  const debounce = (callback: Function, wait: number = 1e3) => {
    let timeout: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (...args: any[]) => {
      window.clearTimeout(timeout);
      timeout = window.setTimeout(() => callback(...args), wait);
    };
  };

  // Calculates the Jaccard similarity between two strings.
  const jaccard = (str1: string, str2: string) => {
    const set1 = new Set(str1.toLowerCase().split(/\s+/).filter(w => w.length > 0));
    const set2 = new Set(str2.toLowerCase().split(/\s+/).filter(w => w.length > 0));

    return set1.intersection(set2).size / set1.union(set2).size;
  };

  const insert = (element: HTMLElement, text: string, append: boolean): Promise<void> => {
    if (demo) {
      return new Promise((resolve) => {
        let i = 0;
        const type = () => {
          const firstMark = element.firstElementChild;
          const lastMark = element.lastElementChild;

          if (i < text.length) {
            const length = 3 + Math.random() * 2;
            const token = text.slice(i, i + length);

            if (append) {
              if (lastMark?.hasAttribute(attribute)) {
                lastMark.append(token);
              } else {
                const mark = document.createElement("mark");
                mark.setAttribute(attribute, "");
                mark.append(token);
                element.append(mark);
              }
            } else {
              if (firstMark?.hasAttribute(attribute)) {
                firstMark.append(token);
              } else {
                const mark = document.createElement("mark");
                mark.setAttribute(attribute, "");
                mark.append(token);
                element.prepend(mark);
              }
            }

            i += length;

            setTimeout(type, 50 + Math.random() * 50);
          } else {
            if (firstMark?.hasAttribute(attribute)) {
              firstMark.removeAttribute(attribute);
            }
            if (lastMark?.hasAttribute(attribute)) {
              lastMark.removeAttribute(attribute);
            }

            resolve();
          }
        };

        type();
      });
    } else {
      if (append) {
        element.append(text);
      } else {
        element.prepend(text);
      }
    }
  };

  let oldBody = "";
  const observe = () => {
    const observer = new MutationObserver(debounce(
      (_: MutationRecord[], observer: MutationObserver) => {
        const newBody = document.body.innerText;
        observer.disconnect();

        if (jaccard(oldBody, newBody) <= jaccardThreshold) {
          console.debug(name, "significant body change detected");
          main();
        }
      }));
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
    });
  };

  const main = async () => {
    oldBody = document.body.innerText;

    let responseBody: IResponseBody;
    try {
      const requestBody: IRequestBody = {
        version,
        domain,
        body: document.body.innerText,
        texts: Array.from(document.body.getElementsByTagName("p"))
          .filter(element => element.closest("[data-mentionads-ignore]") === null)
          .map(element => element.innerText)
          .filter(text => text.length > 0),
        cache,
      };
      const response = await fetch(magicURL +
        "?ref=" + encodeURIComponent(document.location.href), {
        headers: {
          "accept": utf8JSON,
          "content-type": utf8JSON,
        },
        method: "POST",
        body: JSON.stringify(requestBody),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      responseBody = await response.json();
    } catch (error) {
      console.error(name, "E10", error);

      // Avoids using Cloudflare's `{ error: "3001: Unknown internal error" }` as the response body.
      responseBody = defaultResponseBody();
    }

    const update = async (rewrite: IRewrite) => {
      const { from, to } = rewrite;

      const elements = Array.from(document.body.getElementsByTagName("p"))
        .filter(element => element.closest("[data-mentionads-ignore]") === null);
      for (let i = 0; i < elements.length; ++i) {
        const text = elements[i].innerText;
        if (text !== from) {
          continue;
        }

        if (to.startsWith(text)) {
          await insert(elements[i], space + to.slice(text.length), true);
        } else if (to.endsWith(text)) {
          await insert(elements[i], to.slice(0, to.length - text.length) + space, false);
        } else {
          console.warn(name, "E20", rewrite);
        }
      }
    };

    const link = (mention: IMention) => {
      const { substring, title, url } = mention;
      const lowercasedSubstring = substring.toLowerCase();

      // https://developer.mozilla.org/en-US/docs/Web/HTML/Element
      const iterator = document.createNodeIterator(
        document.body,
        NodeFilter.SHOW_TEXT,
        (node: Node) => (node as Text).wholeText.toLowerCase().includes(lowercasedSubstring) &&
          ["ABBR", "B", "BLOCKQUOTE", "CITE", "EM", "FIGCAPTION", "I", "LI", "MARK", "OL", "P", "Q", "SMALL", "SPAN", "STRONG", "U", "UL"]
            .includes(node.parentElement?.tagName ?? "") &&
          node.parentElement?.closest("[data-mentionads-ignore]") === null
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT,
      );

      let node: Text;
      while (node = iterator.nextNode() as Text) {
        if (debug) {
          console.debug(name, "node iterator", node.wholeText);
        }

        // Merges adjacent text nodes because `wholeText` returns the text content of the node and
        // its neighbors; otherwise, the offset used by the range is incorrect.
        node.parentNode?.normalize();

        // Finds matches in the lowercased text nodes.
        const start = node.wholeText.toLowerCase().indexOf(lowercasedSubstring);
        console.assert(start >= 0, name, "E30", substring, node.wholeText);

        const link = document.createElement("a");
        link.title = title;
        link.href = url;
        link.target = "_blank";
        link.rel = "nofollow";
        // link.addEventListener("mousedown", () => {
        //   const blob = new Blob([JSON.stringify({
        //     "event": "click",
        //     version,
        //     url,
        //   })], {
        //     type: utf8JSON,
        //   });
        //   const queued = navigator.sendBeacon(clickURL, blob);
        //   console.assert(queued === true, name, "E40", blob);
        // });

        const range = document.createRange();
        range.setStart(node, start);
        range.setEnd(node, start + substring.length);
        range.surroundContents(link);

        if (debug || demo) {
          const mark = document.createElement("mark");

          const range = document.createRange();
          range.selectNode(link);
          range.surroundContents(mark);
        }
      }
    };

    const { rewrites, mentions } = responseBody;
    for (const rewrite of rewrites) {
      await update(rewrite);
    }
    for (const mention of mentions) {
      link(mention);
    }

    observe();
  };

  if (["interactive", "complete"].includes(document.readyState)) {
    main();
  } else {
    document.addEventListener("DOMContentLoaded", main);
  }
})();
