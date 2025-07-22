# 🚀 Project Setup Guide

## Prerequisites

- Node.js 18.x, 20.x, or 22.x
- npm account
- GitHub repository with Actions enabled

## Setting up NPM Publishing

### 1. Create NPM Token

1. Go to [npmjs.com](https://www.npmjs.com) and log in
2. Click on your profile → "Access Tokens"
3. Click "Generate New Token" → "Automation"
4. Copy the generated token

### 2. Configure GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add the following secrets:

| Secret Name | Description | Value |
|-------------|-------------|-------|
| `NPM_TOKEN` | NPM automation token | Your npm token from step 1 |

### 3. Repository Permissions ⚠️ **IMPORTANT**

Ensure GitHub Actions has write permissions:
- Go to Settings → Actions → General
- Under "Workflow permissions", select **"Read and write permissions"**
- Check **"Allow GitHub Actions to create and approve pull requests"**

### 4. Alternative: Personal Access Token (If permission issues persist)

If you encounter permission errors with the default GITHUB_TOKEN:

1. **Create Personal Access Token**:
   - Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
   - Generate new token with `repo` scope
   
2. **Add to Repository Secrets**:
   - Repository → Settings → Secrets → Add `PERSONAL_TOKEN`
   
3. **Update workflow to use PAT**:
   ```yaml
   - name: Checkout code
     uses: actions/checkout@v4
     with:
       token: ${{ secrets.PERSONAL_TOKEN }}
   ```

## Release Workflow

### Automatic Release (Recommended)

1. **Development**: Work in `develop` branch
2. **Pull Request**: Create PR from `develop` to `main`
3. **Auto Release**: Add `[auto-release]` to PR title
4. **Merge**: When PR is merged, release is automatically triggered

### Manual Release

1. **GitHub UI**: Go to Actions → "Release and Publish" → "Run workflow"
2. **Command Line**: 
   ```bash
   npm run release        # patch version
   npm run release:minor  # minor version
   npm run release:major  # major version
   ```

### Version Bump Control

Include keywords in commit messages to control version bumping:
- `[major]`: Breaking changes (1.0.0 → 2.0.0)
- `[minor]`: New features (1.0.0 → 1.1.0) 
- Default: Patch release (1.0.0 → 1.0.1)

## Troubleshooting

### Permission Errors (403)
- Verify "Read and write permissions" are enabled in Actions settings
- Check if "Allow GitHub Actions to create and approve pull requests" is enabled
- Consider using Personal Access Token if default GITHUB_TOKEN fails

### NPM Publishing Issues
- Verify `NPM_TOKEN` secret is set correctly
- Check if package name is available on npm
- Ensure `private: false` in package.json

### GitHub Actions Issues
- Check repository permissions
- Verify all required secrets are set
- Review action logs for specific errors

### Version Conflicts
- Ensure version in package.json is not already published
- Use `npm version` commands to bump version properly

## First Time Setup

1. **Clone repository**:
   ```bash
   git clone https://github.com/Margarets00/homebridge-kef-speaker.git
   cd homebridge-kef-speaker
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Build project**:
   ```bash
   npm run build
   ```

4. **Run linting**:
   ```bash
   npm run lint
   ```

5. **Test locally**:
   ```bash
   npm link
   # Test with homebridge
   ```

## Development Workflow

1. **Create feature branch**:
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/your-feature-name
   ```

2. **Make changes and test**:
   ```bash
   npm run lint
   npm run build
   ```

3. **Commit and push**:
   ```bash
   git add .
   git commit -m "Add your feature description"
   git push origin feature/your-feature-name
   ```

4. **Create PR to develop**:
   - Create PR from `feature/your-feature-name` to `develop`
   - After review and merge, create PR from `develop` to `main`

## Security Notes

- Never commit NPM tokens to repository
- Use automation tokens for CI/CD, not your personal token
- Regularly rotate tokens if compromised
- Keep GitHub Actions logs clean of sensitive information 