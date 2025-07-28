// Copyright 2024 Mentionlink. All rights reserved.
// Use of this source code is governed by the PolyForm Shield 1.0.0 license
// that can be found in the LICENSE.md file at the root of this repository.

//#region codes
// E00: The script is already running.
// E10: The network or backend had an issue.
// E20: The rewrite is not a prefix or a suffix of the original text.
// E30: The text does not exist in the HTML node, even after concatenation.
// E40: The beacon was not queued, thus instrumentation failed.
// W10: The backend queued the request, but the script needs to retry after a few seconds.
//#endregion

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface Window { mentionlink?: boolean; }

(function () {
  const name = "Mentionlink";
  const version = "1.0.1";
  console.info(name, `v${version}`, "https://docs.mentionlink.com/changelog/");

  if (window.mentionlink) {
    console.warn(name, "E00", "The script is already running.");
    return;
  }
  window.mentionlink = true;

  const { body, location: { hash } } = document;
  const script = document.querySelector("script[src^='https://cdn.mentionlink.com']");
  const config = script?.getAttribute("data-config")
    ?? body?.getAttribute("data-mentionlink")
    ?? "";
  const debug = hash.includes("mentionlink=debug") || config.includes("debug");
  const demo = hash.includes("mentionlink=demo") || config.includes("demo");

  const pageURL = "https://api.mentionlink.com/v1/page";
  const attribute = "data-mentionlink";

  const utf8JSON = "application/json;charset=utf-8";
  const space = " ";

  const jaccardThreshold = 0.8;

  const defaultRetryAfterSeconds = 20;
  let retries = 3;

  //#region interfaces
  // https://api.mentionlink.com/spec.html
  // https://api.mentionlink.com/spec.json?pretty
  interface IRequestBody {
    version: string;
    url: string;
    body: string;
    texts?: string[];
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

  const addCSS = () => {
    const style = document.createElement("style");
    const rules = `
      :root {
        --mentionlink-offset: 3px;
      }

      @keyframes mentionlink-ltr {
        0% {
          width: 0;
          left: calc(-1 * var(--mentionlink-offset));
        }
        50% {
          width: calc(100% + 2 * var(--mentionlink-offset));
          left: calc(-1 * var(--mentionlink-offset));
        }
        100% {
          width: 0;
          left: calc(100% + var(--mentionlink-offset));
        }
      }
      mark.mentionlink {
        position: relative;
        z-index: 0;
        background: none;
        color: inherit;
      }
      mark.mentionlink::before {
        content: '';
        position: absolute;
        z-index: -1;
        top: 0;
        left: 0;
        height: 100%;
        background: yellow;
        border-radius: 3px;
        animation: mentionlink-ltr 2s ease-in-out infinite alternate;
        transform: rotate(-1deg);
      }`;
    style.appendChild(document.createTextNode(rules));
    document.head.appendChild(style);
  };
  addCSS();

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
  const observe = (): void => {
    new MutationObserver(debounce(
      (_: MutationRecord[], observer: MutationObserver) => {
        const newBody = document.body.innerText;
        observer.disconnect();

        if (jaccard(oldBody, newBody) <= jaccardThreshold) {
          console.debug(name, "significant body change detected");
          main();
        }
      })).observe(document.body, {
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
        url: document.location.href,
        body: document.body.innerText,
        texts: Array.from(document.body.getElementsByTagName("p"))
          .filter(element => element.closest("[data-mentionlink-ignore]") === null)
          .map(element => element.innerText)
          .filter(text => text.length > 0),
      };
      const response = await fetch(pageURL, {
        headers: {
          "accept": utf8JSON,
          "content-type": utf8JSON,
        },
        method: "POST",
        body: JSON.stringify(requestBody),
      });
      if ([202, 409].includes(response.status) && retries--/*decrement*/ > 0) {
        const retryAfterSeconds = parseInt(response.headers.get("retry-after")
          ?? defaultRetryAfterSeconds.toString());
        console.warn(name, "W10", `HTTP ${response.status}`, `Retrying in ${retryAfterSeconds} seconds...`);
        await new Promise(resolve => setTimeout(resolve, retryAfterSeconds * 1e3));

        return main();
      }
      if (response.status !== 200) {
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
        .filter(element => element.closest("[data-mentionlink-ignore]") === null);
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
          node.parentElement?.closest("[data-mentionlink-ignore]") === null
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

        const range = document.createRange();
        range.setStart(node, start);
        range.setEnd(node, start + substring.length);
        range.surroundContents(link);

        if (debug || demo) {
          const mark = document.createElement("mark");
          mark.classList.add("mentionlink");

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
