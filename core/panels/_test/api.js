module.exports = ({ hooks, config, auth, panel }) => ({
  endpoint: `/api/panels/${panel.id}`,

  handler: async (req, res) => {
    const user = auth.check(req);
    if (!user) return res.status(403).json({ error: 'Unauthorized' });

    const data = { message: 'Hello from _test panel!', ts: Date.now() };
    const filtered = await hooks.filter(`panel.${panel.id}.data`, data, { user });

    res.json(filtered);
  }
});
