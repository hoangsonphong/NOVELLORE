const SUPABASE_URL = 'https://snimdewrrausajqjpcqi.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNuaW1kZXdycmF1c2FqcWpwY3FpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4ODUwNjQsImV4cCI6MjA5MzQ2MTA2NH0.C4KJvcP_7Nblxw7Tfce5osEW36L5iazMunY2fQBfcT4';

const DEMO_ADMIN = {
  email: 'admin@novellore.com',
  password: '123456',
  name: 'Admin',
  role: 'admin'
};

const NovelLoreAuth = (() => {
  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

  function getCachedUsers() {
    return JSON.parse(localStorage.getItem('users')) || [];
  }

  function saveCachedUsers(users) {
    localStorage.setItem('users', JSON.stringify(users));
  }

  function ensureDemoAdmin() {
    const users = getCachedUsers();
    const hasAdmin = users.some(user => user.email === DEMO_ADMIN.email);
    if (hasAdmin) return;

    saveCachedUsers([...users, { ...DEMO_ADMIN }]);
  }

  function getCachedUserByEmail(email) {
    if (!email) return null;
    return getCachedUsers().find(user => user.email === email) || null;
  }

  function upsertCachedUser(user) {
    if (!user || !user.email) return;
    const users = getCachedUsers();
    const nextUsers = users.filter(item => item.email !== user.email);
    nextUsers.push(user);
    saveCachedUsers(nextUsers);
  }

  async function resolveCurrentUser() {
    const { data: sessionData } = await sb.auth.getSession();
    const sessionUser = sessionData?.session?.user;

    if (!sessionUser) {
      const cachedCurrentUser = JSON.parse(localStorage.getItem('currentUser'));
      if (cachedCurrentUser?.email) {
        upsertCachedUser(cachedCurrentUser);
        return cachedCurrentUser;
      }

      localStorage.removeItem('currentUser');
      return null;
    }

    const cachedUser = getCachedUserByEmail(sessionUser.email) || {};
    let profile = null;

    const { data: profileData } = await sb
      .from('profiles')
      .select('username, display_name, role')
      .eq('id', sessionUser.id)
      .maybeSingle();

    if (profileData) {
      profile = profileData;
    }

    const normalizedUser = {
      id: sessionUser.id,
      email: sessionUser.email,
      name:
        cachedUser.name ||
        profile?.display_name ||
        sessionUser.user_metadata?.display_name ||
        profile?.username ||
        sessionUser.email,
      role: cachedUser.role || profile?.role || 'user'
    };

    localStorage.setItem('currentUser', JSON.stringify(normalizedUser));
    upsertCachedUser(normalizedUser);
    return normalizedUser;
  }

  async function logoutUser() {
    try {
      await sb.auth.signOut();
    } finally {
      localStorage.removeItem('currentUser');
    }
  }

  return {
    sb,
    ensureDemoAdmin,
    resolveCurrentUser,
    logoutUser,
    getCachedUsers,
    saveCachedUsers,
    getCachedUserByEmail,
    upsertCachedUser
  };
})();

NovelLoreAuth.ensureDemoAdmin();
window.NovelLoreAuth = NovelLoreAuth;
