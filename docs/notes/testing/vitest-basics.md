---
title: Vitest basics
description: A nested page, to show breadcrumbs and deeper folders.
order: 1
tags: [testing, tooling]
updated: 2026-10-24
accent: 150
---

## Run

```sh
vp test
```

## A first test

```ts
import { expect, test } from "vitest";

test("adds", () => {
  expect(1 + 1).toBe(2);
});
```
