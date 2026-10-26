import * as consentCopy from './20261025_192100_consent_copy';
import * as migration_20261025_184339_initial_cms from './20261025_184339_initial_cms';
import * as migration_20261025_190430_editable_microcopy from './20261025_190430_editable_microcopy';
import * as microcopyDefaults from './20261025_190600_microcopy_defaults';
import * as formTranslations from './20261025_190700_form_translations';
import * as blockAppearance from './20261025_190900_block_appearance';
import * as audienceCategories from './20261025_191100_audience_categories';
import * as calendarReminders from './20261025_192000_calendar_reminders';
import * as reminderIdentity from './20261025_192200_reminder_identity';
import * as historicalGridLayout from './20261026_010000_historical_grid_layout';

export const migrations = [
  {
    up: migration_20261025_184339_initial_cms.up,
    down: migration_20261025_184339_initial_cms.down,
    name: '20261025_184339_initial_cms',
  },
  {
    up: migration_20261025_190430_editable_microcopy.up,
    down: migration_20261025_190430_editable_microcopy.down,
    name: '20261025_190430_editable_microcopy'
  },
  {up:microcopyDefaults.up,down:microcopyDefaults.down,name:'20261025_190600_microcopy_defaults'},
  { up: formTranslations.up, down: formTranslations.down, name: '20261025_190700_form_translations' },
  {up:blockAppearance.up,down:blockAppearance.down,name:'20261025_190900_block_appearance'},
  {up:audienceCategories.up,down:audienceCategories.down,name:'20261025_191100_audience_categories'},
  {up:calendarReminders.up,down:calendarReminders.down,name:'20261025_192000_calendar_reminders'},
  {up:consentCopy.up,down:consentCopy.down,name:'20261025_192100_consent_copy'},
  {up:reminderIdentity.up,down:reminderIdentity.down,name:'20261025_192200_reminder_identity'},
  {up:historicalGridLayout.up,down:historicalGridLayout.down,name:'20261026_010000_historical_grid_layout'},
];
