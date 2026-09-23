# Game bridge

Install STS2MCP separately using [upstream documentation](https://github.com/Gennadiyev/STS2MCP). Jev The Spire talks directly to its HTTP API; the optional MCP server is not required.

The bridge must expose `http://127.0.0.1:15526/api/v1/singleplayer`. Check that URL with the game running before starting autoplay.

Development used game v0.107.1 and STS2MCP commit `55e064850a68f3b4cde7e5fd525bf9b2dec4e885`, rebuilt with .NET 9 against local game assemblies. The 0.4.0 binary failed because `CombatManager.IsPlayPhase` had changed. Follow upstream build instructions for your game version; this repository does not ship a bridge binary or game assemblies.

The optional [deck-state patch](../spire-demo/vendor/deck-state.patch) exposes the visible permanent deck for deck-building decisions. Apply it to the matching upstream source before building (`git apply /path/to/deck-state.patch`). It changes observation data, not game rules. Without the patch, permanent-deck context may be unavailable.

On macOS the mods directory is inside `SlayTheSpire2.app/Contents/MacOS/mods/`. Enable mods in the game. Use a normal singleplayer run; compatibility with other gameplay mods is not established.

The vendored [API reference](../spire-demo/vendor/api-reference.md) documents the bridge contract used during development. Upstream and game versions may differ.

## Verified build used for the first win

Checked September 23, 2026: the installed mod DLL and local Release build are byte-identical. The build checkout is upstream `55e064850a68f3b4cde7e5fd525bf9b2dec4e885` plus exactly the vendored `deck-state.patch`. The repository patch matches the local source diff. The DLL SHA-256 is `a5bebf899d3ce0f0c788f9bd14a0a1e1b368e2e0cf08434b4b3684245dbf9886` (provenance for this build; rebuilding on another SDK need not produce an identical binary).

To reproduce the source and build with .NET 9:

```sh
git clone https://github.com/Gennadiyev/STS2MCP.git
cd STS2MCP
git checkout 55e064850a68f3b4cde7e5fd525bf9b2dec4e885
git apply /path/to/jev-the-spire/spire-demo/vendor/deck-state.patch
dotnet build STS2_MCP.csproj -c Release -p:STS2GameDir="/path/to/Slay the Spire 2"
```

Install the resulting `bin/Release/net9.0/STS2_MCP.dll` and upstream `mod_manifest.json` (renamed `STS2_MCP.json`) following upstream installation instructions. Quit the game before replacing its mod files. The game assemblies are read from your own game installation and are not redistributed here. Nothing in the visualizer requires running or changing the mod.
