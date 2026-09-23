# Jev the Spire

Static progress dashboard with 182-run snapshot, strategy history, and recorded Jev token usage.

Serve locally:

```sh
python3 -m http.server 4390 --bind 127.0.0.1 --directory dist
```

The data generator and accounting documentation are maintained in the [Jev The Spire repository](https://github.com/alexmeckes/jev-the-spire). Token counts aggregate logged decision usage once, including review passes. Offline evaluations and Luna usage are excluded. Failed pipelines may leave unlogged usage; this is not a billing statement.
