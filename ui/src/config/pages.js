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
  }
];

export const DEFAULT_PAGES = [
  {
    id: 'home',
    name: 'Home',
    widgets: [
      { id: 'learning-progress', config: { timeframe: '30d', showStreak: true } },
      { id: 'activity-feed', config: { itemLimit: 8 } }
    ]
  },
  {
    id: 'classroom',
    name: 'Classroom',
    widgets: [
      { id: 'module-health', config: { severity: 'warning' } },
      { id: 'notes', config: { placeholder: 'Class notes...' } }
    ]
  }
];
