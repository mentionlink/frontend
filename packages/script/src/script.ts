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
  console.info(name, `v${version}`, "https://mentionads.com/changelog");

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

  const searchURL = "https://api.mentionads.com/v1/search";
  const clickURL = "https://api.mentionads.com/v1/click";
  const attribute = "data-mentionads";

  const utf8JSON = "application/json;charset=utf-8";
  const space = " ";

  //#region interfaces
  // https://mentionads.com/spec.json
  interface IRequestBody {
    version: string;
    domain: string;
    text: string;
    texts?: string[];
    cache?: boolean;
  };
  interface IRewrite {
    from: string;
    to: string;
  };
  interface IMention {
    text: string;
    title: string;
    url: string;
    alt?: string;
  };
  interface IResponseBody {
    rewrites: IRewrite[],
    mentions: IMention[],
  };
  //#endregion
  const defaultResponseBody = (): IResponseBody => ({
    rewrites: [],
    mentions: [],
  });

  // const debounce = (callback: Function, wait: number = 1e3) => {
  //   let timeout: number;
  //   return (...args: any[]) => {
  //     clearTimeout(timeout);
  //     timeout = setTimeout(() => callback(...args), wait);
  //   };
  // };

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

  const main = async () => {
    let responseBody: IResponseBody;
    try {
      const requestBody: IRequestBody = {
        version,
        domain,
        text: document.body.innerText,
        texts: Array.from(document.body.getElementsByTagName("p"))
          .filter(element => element.closest("[data-mentionads-ignore]") === null)
          .map(element => element.innerText)
          .filter(text => text.length > 0),
        cache,
      };
      const response = await fetch(searchURL +
        "?ref=" + encodeURIComponent(document.location.href), {
        // credentials: "include", // commented out, thus does NOT send cookies
        headers: {
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
      const { text, title, url } = mention;

      // https://developer.mozilla.org/en-US/docs/Web/HTML/Element
      const iterator = document.createNodeIterator(
        document.body,
        NodeFilter.SHOW_TEXT,
        (node: Node) => (node as Text).wholeText.includes(text) &&
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

        const start = node.wholeText.indexOf(text);
        console.assert(start >= 0, name, "E30", text, node.wholeText);

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
        range.setEnd(node, start + text.length);
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
  };

  if (["interactive", "complete"].includes(document.readyState)) {
    main();
  } else {
    document.addEventListener("DOMContentLoaded", main);
  }
})();
