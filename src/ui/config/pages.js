export const PAGE_WIDGET_LIBRARY = [
    {
        id: 'learning-progress',
        title: 'Learning Progress',
        description: 'Track completion trends and active streaks.',
        defaultConfig: { timeframe: '7d', showStreak: true }
    },
    {
        id: 'activity-feed',
        title: 'Activity Feed',
        description: 'Recent social and classroom activity.',
        defaultConfig: { itemLimit: 5 }
    },
    {
        id: 'module-health',
        title: 'Module Health',
        description: 'Live status from installed Cognis modules.',
        defaultConfig: { severity: 'all' }
    },
    {
        id: 'notes',
        title: 'Quick Notes',
        description: 'Scratch pad for teachers and learners.',
        defaultConfig: { placeholder: 'Add a note...' }
    },
    {
        id: 'calendar',
        title: 'Calendar',
        description: 'Upcoming deadlines and events.',
        defaultConfig: { range: 'month' }
    },
    {
        id: 'announcements',
        title: 'Announcements',
        description: 'Pinned updates from admins.',
        defaultConfig: { maxItems: 3 }
    }
];

export const DEFAULT_PAGES = [
    {
        id: 'sandbox',
        name: 'Sandbox',
        widgets: PAGE_WIDGET_LIBRARY.map((widget) => ({
            id: widget.id,
            config: { ...widget.defaultConfig }
        }))
    },
    {
        id: 'home',
        name: 'Home',
        widgets: [
            { id: 'learning-progress', config: { timeframe: '30d', showStreak: true } },
            { id: 'activity-feed', config: { itemLimit: 8 } }
        ]
    }
];
