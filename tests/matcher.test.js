const assert = require("node:assert/strict");
const { describe, it } = require("node:test");

const {
  parseQuery,
  tabContains,
  filterTabs,
  hostnameOf,
  tabsMatchingHostname,
} = require("../matcher.js");

describe("parseQuery", () => {
  it("treats plain text as a single lowercased phrase", () => {
    assert.deepEqual(parseQuery("Hello World"), {
      phrase: "hello world",
      excludes: [],
    });
  });

  it("keeps multi-word phrases intact rather than splitting into terms", () => {
    assert.equal(parseQuery("new york times").phrase, "new york times");
  });

  it("extracts -prefixed tokens as exclusions", () => {
    assert.deepEqual(parseQuery("news -Sports -weather"), {
      phrase: "news",
      excludes: ["sports", "weather"],
    });
  });

  it("supports exclusion-only queries", () => {
    assert.deepEqual(parseQuery("-github"), {
      phrase: "",
      excludes: ["github"],
    });
  });

  it("treats a lone dash as part of the phrase, not an exclusion", () => {
    assert.deepEqual(parseQuery("foo - bar"), {
      phrase: "foo - bar",
      excludes: [],
    });
  });

  it("handles empty and whitespace-only input", () => {
    assert.deepEqual(parseQuery(""), { phrase: "", excludes: [] });
    assert.deepEqual(parseQuery("   "), { phrase: "", excludes: [] });
  });
});

describe("tabContains", () => {
  it("matches against the URL case-insensitively", () => {
    assert.equal(
      tabContains({ url: "https://GitHub.com/foo", title: "Foo" }, "github"),
      true,
    );
  });

  it("matches against the title case-insensitively", () => {
    assert.equal(
      tabContains({ url: "https://example.com", title: "My GitHub" }, "github"),
      true,
    );
  });

  it("returns false when neither matches", () => {
    assert.equal(
      tabContains({ url: "https://example.com", title: "Example" }, "github"),
      false,
    );
  });

  it("tolerates missing url and title", () => {
    assert.equal(tabContains({}, "github"), false);
    assert.equal(tabContains({ title: "GitHub" }, "github"), true);
  });
});

describe("filterTabs", () => {
  const tabs = [
    { id: 1, url: "https://github.com/a", title: "Repo A" },
    { id: 2, url: "https://github.com/b", title: "Repo B - news" },
    { id: 3, url: "https://news.example.com", title: "Daily News" },
    { id: 4, url: undefined, title: undefined },
  ];

  it("returns no tabs for empty text", () => {
    assert.deepEqual(filterTabs(tabs, ""), []);
    assert.deepEqual(filterTabs(tabs, "   "), []);
  });

  it("matches phrase against url or title", () => {
    assert.deepEqual(
      filterTabs(tabs, "github").map((t) => t.id),
      [1, 2],
    );
    assert.deepEqual(
      filterTabs(tabs, "news").map((t) => t.id),
      [2, 3],
    );
  });

  it("applies exclusions on top of the phrase", () => {
    assert.deepEqual(
      filterTabs(tabs, "news -github").map((t) => t.id),
      [3],
    );
  });

  it("matches everything except exclusions when the query is exclusion-only", () => {
    assert.deepEqual(
      filterTabs(tabs, "-github").map((t) => t.id),
      [3, 4],
    );
  });

  it("does not crash on tabs with missing url/title", () => {
    assert.deepEqual(
      filterTabs(tabs, "repo -a").map((t) => t.id),
      [2],
    );
  });
});

describe("hostnameOf", () => {
  it("returns the hostname of a valid URL", () => {
    assert.equal(hostnameOf("https://github.com/foo/bar"), "github.com");
  });

  it("returns null for missing, invalid, or hostless URLs", () => {
    assert.equal(hostnameOf(undefined), null);
    assert.equal(hostnameOf(""), null);
    assert.equal(hostnameOf("not a url"), null);
    assert.equal(hostnameOf("about:blank"), null);
  });
});

describe("tabsMatchingHostname", () => {
  const tabs = [
    { id: 1, url: "https://github.com/a" },
    { id: 2, url: "https://gist.github.com/b" },
    { id: 3, url: "https://github.com/c" },
    { id: 4, url: undefined },
    { id: 5, url: "about:blank" },
  ];

  it("matches the exact hostname only, not subdomains", () => {
    assert.deepEqual(
      tabsMatchingHostname(tabs, "github.com").map((t) => t.id),
      [1, 3],
    );
  });

  it("returns nothing for a hostname with no matches", () => {
    assert.deepEqual(tabsMatchingHostname(tabs, "example.com"), []);
  });
});
