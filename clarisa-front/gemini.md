## Contributing

We use and recommend the following convention for commit messages:

### Commit Message Format

Each commit message consists of a **header**, a **body** and a **footer**. The header has a special
format that includes a **type**, a **scope** and a **subject**:

```
<type>(<scope>): <subject>
<BLANK LINE>
<body>
<BLANK LINE>
<footer>
```

The **header** is mandatory and the **scope** of the header is optional.

### Type

Must be one of the following:

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc)
- **refactor**: A code change that neither fixes a bug nor adds a feature
- **perf**: A code change that improves performance
- **test**: Adding missing or correcting existing tests
- **chore**: Changes to the build process or auxiliary tools and libraries such as documentation generation

### Scope

The scope should be the name of the npm package affected (as perceived by person reading the changelog generated from commit messages).

### Subject

The subject contains a succinct description of the change:

- use the imperative, present tense: "change" not "changed" nor "changes"
- don't capitalize first letter
- no dot (.) at the end

### Body

Just as in the **subject**, use the imperative, present tense: "change" not "changed" nor "changes".
The body should include the motivation for the change and contrast this with previous behavior.

### Footer

The footer should contain any information about **Breaking Changes** and is also the place to
reference GitHub issues that this commit **Closes**.

**Breaking Changes** should start with the word `BREAKING CHANGE:` with a space or two newlines. The rest of the commit message is then used for this.
A detailed explanation of the format can be found in this [document][commit-message-format].

[commit-message-format]: https://docs.google.com/document/d/1QrDFcIiPjSLDn3EL15IJygNPi9EHl0XRZzGCKveyp5s/edit?usp=sharing

### Icons

It is recommended to use an icon at the beginning of the commit message subject to visually identify the type of change. Here are some common icons:

- ✨ `:sparkles:` for new features
- 🐛 `:bug:` for bug fixes
- 📝 `:memo:` for documentation
- 🎨 `:art:` for styling
- ♻️ `:recycle:` for refactoring
- ✅ `:white_check_mark:` for tests
- 🚀 `:rocket:` for performance improvements
- 🔧 `:wrench:` for tooling/configuration
