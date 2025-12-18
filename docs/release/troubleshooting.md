# Troubleshooting

Common issues and solutions for the release process.

## Changelog Generation

### Changelog generation fails

**Problem**: Changelog generation fails or is skipped.

**Solutions**:
- **For stable releases**: Ensure you're on `main` branch. Changelog only generates on `main` after PR merge.
- **For squash-and-merge**: Ensure PR titles follow conventional commits format (e.g., `feat(backend): add feature`). The PR title becomes the commit message.
- Ensure `semantic-release` is installed: `npm install`
- Check that commits follow conventional commit format
- Verify `GITHUB_TOKEN` is set (optional, only needed for GitHub releases)
- Use `--skip-changelog` to skip if not needed (only for stable releases)
- **For beta releases**: Changelog generation is intentionally skipped to avoid duplicates when merging to main

### Changelog analyzes all commits

**Problem**: Semantic-release is analyzing all commits from the start of the project.

**Explanation**: This is **normal behavior** for the first run. Semantic-release uses git tags to track releases:
- **First run** (no tags): Analyzes all commits from the start
- **After first release**: Creates a tag (e.g., `v1.0.0`)
- **Subsequent runs**: Only analyzes commits after the last tag

**Solutions**:
- This is expected - the first release will create a tag
- After the first release, subsequent runs will only analyze new commits
- If you want to start from a specific version, create an initial tag: `git tag v1.0.0`
- Semantic-release will then only analyze commits after that tag

## Commit Message Validation

### Commit message validation fails

**Problem**: Git commit is rejected due to invalid commit message format.

**Solutions**:
- Review the commit message format (see [Changelog Guide](./changelog.md))
- Use `git commit --no-verify` to bypass (not recommended)
- Fix the commit message: `git commit --amend`

## Local Testing Issues

### Prometheus fails with "permission denied"

**Problem**: Prometheus container exits with error:
```
Error opening query log file" file=/prometheus/queries.active err="open /prometheus/queries.active: permission denied"
panic: Unable to create mmap-ed active query log
```

**Cause**: The data directories don't exist or have incorrect ownership. Prometheus runs as user `65534:65534` (nobody) and needs write access to its data directory.

**Solution**: Run the setup script before starting services:
```bash
make setup
```

Or fix manually:
```bash
# Create directory if missing
mkdir -p data/prometheus-release

# Set correct ownership
sudo chown -R 65534:65534 data/prometheus-release
```

The same applies to other data directories:
- `data/grafana-release` → owned by `472:472`
- `data/leveldb-release` → owned by `1000:1000`

### Services fail to start after fresh clone

**Problem**: Services fail immediately after cloning the repository.

**Solution**: Always run setup first:
```bash
make setup
make up        # for development
make up-stable # for stable release testing
make up-beta   # for beta release testing
```

## Docker Build

### Docker build fails

**Problem**: Docker build fails with network or resource errors.

**Solutions**:
- Check Docker daemon is running: `docker info`
- Verify disk space: `df -h`
- Check network connectivity
- Scripts automatically retry failed builds (up to 2 attempts)

### Image already exists

**Problem**: Script skips building because image already exists in registry.

**Solutions**:
- This is expected behavior - script skips rebuild if version unchanged and image exists
- To force rebuild, bump the version first
- Or manually delete the image from registry if needed

### Cross-architecture build fails with "exec format error"

**Problem**: Multi-platform Docker build fails with error like:
```
exec /bin/sh: exec format error
```

This typically occurs on the `linux/arm64` build step when running on an `amd64` machine (or vice versa).

**Cause**: The release scripts build for both `linux/amd64` and `linux/arm64` platforms. When Docker buildx builds for a non-native architecture, it requires QEMU emulation to execute binaries for that architecture.

**Solutions**:

1. **Quick fix - Install QEMU via Docker** (recommended, works on any system):
   ```bash
   docker run --privileged --rm tonistiigi/binfmt --install all
   ```
   This registers the necessary QEMU handlers for cross-platform builds. You only need to run this once (or after a system restart).

2. **Fedora/RHEL**:
   ```bash
   sudo dnf install qemu-user-static
   sudo systemctl restart systemd-binfmt
   ```

3. **Ubuntu/Debian**:
   ```bash
   sudo apt-get install qemu-user-static
   sudo systemctl restart systemd-binfmt
   ```

4. **macOS**: Docker Desktop includes QEMU support by default. If you encounter this issue, try restarting Docker Desktop.

**Verification**: After installing QEMU, verify it's working:
```bash
docker buildx ls
```
You should see platforms like `linux/amd64`, `linux/arm64`, `linux/arm/v7` listed.

## Beta Releases

### CI check fails

**Problem**: Beta release is blocked because CI check fails.

**Solutions**:
- Wait for CI to complete and pass
- Fix failing tests
- Use `--skip-ci-check` only if absolutely necessary (not recommended)

### Branch validation fails

**Problem**: Release script fails with branch validation error.

**Solutions**:
- **Stable releases**: Must be on `main` branch
- **Beta releases**: Must NOT be on `main` branch
- Ensure branch is up-to-date with `origin/main`
- Push all local commits to remote

### Branch not aligned with main

**Problem**: Beta release fails because branch is not aligned with `origin/main`.

**Solutions**:
- Merge or rebase with `origin/main`:
  ```bash
  git fetch origin
  git merge origin/main
  # or
  git rebase origin/main
  ```
- Push updated branch: `git push`

### Local commits not pushed

**Problem**: Beta release fails because local commits are not pushed to remote.

**Solutions**:
- Push all local commits: `git push`
- Or create a new branch if you don't want to push yet

## Resource Issues

### Low disk space warning

**Problem**: Script warns about low disk space.

**Solutions**:
- Free up disk space (recommended: at least 5GB free)
- Script will continue but builds may fail
- Check with: `df -h`

### Docker daemon not running

**Problem**: Script fails because Docker daemon is not running.

**Solutions**:
- Start Docker daemon
- Check with: `docker info`
- On Linux: `sudo systemctl start docker`
- On macOS: Start Docker Desktop

## Debugging

### Verbose debugging

To get detailed debugging information:

```bash
# Enable verbose mode
scripts/release.sh --verbose --bump-version

# Or set DEBUG environment variable
DEBUG=true scripts/release.sh --bump-version
```

This will show:
- Stack traces on errors
- Timestamps on all log messages
- Detailed command output
- Internal state information

### Dry run mode

To preview what would happen without making changes:

```bash
scripts/release.sh --dry-run
scripts/beta-release.sh --dry-run
```

This shows all actions that would be taken without actually executing them.

## Version Issues

### Version format errors

**Problem**: Script fails with version format validation errors.

**Solutions**:
- Ensure all versions follow semantic versioning: `X.Y.Z` or `X.Y.Z-prerelease`
- Check `package.json` files for valid version strings
- Beta versions should include prerelease suffix: `1.2.3-beta.0`

### Version extraction fails

**Problem**: Script cannot extract version from docker-compose.yml.

**Solutions**:
- Check compose file format matches expected pattern
- Image references must include version tags (not just `:latest`)
- Service name must match exactly (case-sensitive)
- Check indentation (script supports flexible indentation)

## Network Issues

### Docker login fails

**Problem**: Docker login to GitHub Container Registry fails.

**Solutions**:
- Verify credentials are correct
- Check `GITHUB_USERNAME` and `GITHUB_TOKEN` environment variables
- Token must have `write:packages` scope
- Try logging in manually: `docker login ghcr.io`

### Image push fails

**Problem**: Image push to registry fails.

**Solutions**:
- Check network connectivity
- Verify registry credentials
- Check if image already exists (script will skip if found)
- Scripts automatically retry failed pushes (up to 2 attempts)

## Manifest Updates

### Manifest update fails

**Problem**: Script fails to update umbrel-app manifests.

**Solutions**:
- Check file paths are correct
- Verify files exist and are writable
- Check for syntax errors in YAML files
- Ensure `bump-umbrel-app-version.sh` is executable

### Version bump seems wrong

**Problem**: App version is bumped incorrectly.

**Solutions**:
- Check the log output - it shows which change type was detected
- Verify the highest change type across all services
- For beta, check that the beta suffix is being handled correctly
- Review version calculation logic in [Scripts Reference](./scripts.md)

## Getting Help

If you encounter issues not covered here:

1. Check the script output with `--verbose` flag
2. Review the relevant documentation:
   - [Stable Releases](./stable-releases.md)
   - [Beta Releases](./beta-releases.md)
   - [Scripts Reference](./scripts.md)
3. Check git status and ensure working directory is clean
4. Verify all prerequisites are met
5. Review error messages carefully - they often contain actionable information
