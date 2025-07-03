import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'

// https://vitepress.dev/reference/site-config
export default withMermaid(
  defineConfig({
    title: 'Awell Panels Documentation',
    description: 'Comprehensive documentation for the Panels Management System',
    ignoreDeadLinks: true,
    cleanUrls: true,
    base: '/panels/',

    themeConfig: {
      // https://vitepress.dev/reference/default-theme-config
      nav: [
        { text: 'Home', link: '/' },
        { text: 'Intro', link: '/intro' },
        { text: 'Tutorials', link: '/getting-started/' },
        { text: 'How-to Guides', link: '/guides/' },
        { text: 'Reference', link: '/reference/' },
        { text: 'Explanation', link: '/explanation/' },
        { text: 'Interactive', link: '/interactive/' },
        { text: 'Examples', link: '/examples/' },
      ],

      sidebar: {
        '/': [{ text: 'Intro', link: '/intro' }],
        '/getting-started/': [
          {
            text: 'Tutorial',
            items: [
              { text: 'Introduction', link: '/getting-started/' },
              { text: 'Installation', link: '/getting-started/installation' },
              {
                text: 'Environment Setup',
                link: '/getting-started/environment-setup',
              },
              {
                text: 'Your First Panel',
                link: '/getting-started/first-panel',
              },
              {
                text: 'Adding Data Sources',
                link: '/getting-started/adding-data-sources',
              },
              {
                text: 'Creating Columns',
                link: '/getting-started/creating-columns',
              },
              {
                text: 'Building Views',
                link: '/getting-started/building-views',
              },
              { text: 'Next Steps', link: '/getting-started/next-steps' },
            ],
          },
        ],

        '/guides/': [
          {
            text: 'Panel Management',
            items: [
              {
                text: 'How to create a panel',
                link: '/guides/panels/create-panel',
              },
              {
                text: 'How to add columns',
                link: '/guides/panels/add-columns',
              },
              {
                text: 'How to configure filters',
                link: '/guides/panels/configure-filters',
              },
              {
                text: 'How to share views',
                link: '/guides/panels/share-views',
              },
              {
                text: 'How to set up alerts',
                link: '/guides/panels/setup-alerts',
              },
            ],
          },
          {
            text: 'Data Sources',
            items: [
              {
                text: 'How to connect to FHIR',
                link: '/guides/data-sources/connect-fhir',
              },
              {
                text: 'How to integrate with EHR',
                link: '/guides/data-sources/integrate-ehr',
              },
              {
                text: 'How to sync data',
                link: '/guides/data-sources/sync-data',
              },
              {
                text: 'How to troubleshoot connections',
                link: '/guides/data-sources/troubleshoot',
              },
            ],
          },
          {
            text: 'Healthcare Workflows',
            items: [
              {
                text: 'How to manage patient cohorts',
                link: '/guides/healthcare/manage-cohorts',
              },
              {
                text: 'How to track quality measures',
                link: '/guides/healthcare/quality-measures',
              },
              {
                text: 'How to set up clinical alerts',
                link: '/guides/healthcare/clinical-alerts',
              },
              {
                text: 'How to generate reports',
                link: '/guides/healthcare/generate-reports',
              },
            ],
          },
          {
            text: 'Administration',
            items: [
              {
                text: 'How to manage users',
                link: '/guides/admin/manage-users',
              },
              {
                text: 'How to configure permissions',
                link: '/guides/admin/configure-permissions',
              },
              {
                text: 'How to set up multi-tenancy',
                link: '/guides/admin/multi-tenancy',
              },
              {
                text: 'How to audit activities',
                link: '/guides/admin/audit-activities',
              },
            ],
          },
          {
            text: 'Development',
            items: [
              {
                text: 'How to integrate the API',
                link: '/guides/development/integrate-api',
              },
              {
                text: 'How to create custom columns',
                link: '/guides/development/custom-columns',
              },
              {
                text: 'How to extend the UI',
                link: '/guides/development/extend-ui',
              },
              {
                text: 'How to write tests',
                link: '/guides/development/write-tests',
              },
            ],
          },
          {
            text: 'Deployment & Operations',
            items: [
              {
                text: 'How to deploy to AWS',
                link: '/guides/deployment/deploy-aws',
              },
              {
                text: 'How to deploy to Kubernetes',
                link: '/guides/deployment/deploy-k8s',
              },
              {
                text: 'How to set up monitoring',
                link: '/guides/deployment/setup-monitoring',
              },
              {
                text: 'How to backup data',
                link: '/guides/deployment/backup-data',
              },
              {
                text: 'How to scale the system',
                link: '/guides/deployment/scale-system',
              },
            ],
          },
          {
            text: 'Troubleshooting',
            items: [
              {
                text: 'How to debug performance issues',
                link: '/guides/troubleshooting/performance',
              },
              {
                text: 'How to fix connection problems',
                link: '/guides/troubleshooting/connections',
              },
              {
                text: 'How to resolve data sync errors',
                link: '/guides/troubleshooting/data-sync',
              },
              {
                text: 'How to handle authentication issues',
                link: '/guides/troubleshooting/auth',
              },
            ],
          },
        ],

        '/interactive/': [
          {
            text: 'Interactive Tools',
            items: [
              {
                text: 'Configuration Generator',
                link: '/interactive/config-generator',
              },
            ],
          },
        ],

        '/reference/': [
          {
            text: 'API Client',
            items: [
              { text: 'Panels API', link: '/reference/api-client/panels-api' },
              { text: 'Views API', link: '/reference/api-client/views-api' },
              { text: 'TypeScript Types', link: '/reference/api-client/types' },
              {
                text: 'Endpoints Mapping',
                link: '/reference/api-client/endpoints',
              },
            ],
          },
          {
            text: 'Backend API',
            items: [
              {
                text: 'Panel Endpoints',
                link: '/reference/backend-api/panels/',
              },
              { text: 'View Endpoints', link: '/reference/backend-api/views/' },
              {
                text: 'Column Endpoints',
                link: '/reference/backend-api/columns/',
              },
              {
                text: 'Data Source Endpoints',
                link: '/reference/backend-api/datasources/',
              },
              {
                text: 'Request/Response Schemas',
                link: '/reference/backend-api/schemas',
              },
            ],
          },
          {
            text: 'Database',
            items: [
              {
                text: 'MikroORM Entities',
                link: '/reference/database/entities',
              },
              {
                text: 'Database Schema',
                link: '/reference/database/schema',
              },
              {
                text: 'Migrations',
                link: '/reference/database/migrations',
              },
            ],
          },
          {
            text: 'Configuration',
            items: [
              {
                text: 'Environment Variables',
                link: '/reference/configuration/environment-vars',
              },
              {
                text: 'Data Types',
                link: '/reference/configuration/data-types',
              },
            ],
          },
          {
            text: 'Testing',
            items: [
              {
                text: 'Bruno Collection',
                link: '/reference/bruno-collection/api-testing',
              },
            ],
          },
        ],

        '/explanation/': [
          {
            text: 'System Architecture',
            items: [
              {
                text: 'Why this architecture',
                link: '/explanation/architecture/system-overview',
              },
              {
                text: 'Understanding the data model',
                link: '/explanation/architecture/data-model',
              },
              {
                text: 'Multi-tenancy explained',
                link: '/explanation/architecture/multi-tenancy',
              },
              {
                text: 'Security model rationale',
                link: '/explanation/architecture/security-model',
              },
            ],
          },
          // {
          //   text: 'Core Concepts',
          //   items: [
          //     {
          //       text: 'Panels vs Views explained',
          //       link: '/explanation/concepts/panels-vs-views',
          //     },
          //     {
          //       text: 'How calculated columns work',
          //       link: '/explanation/concepts/calculated-columns',
          //     },
          //     {
          //       text: 'Understanding change tracking',
          //       link: '/explanation/concepts/change-tracking',
          //     },
          //     {
          //       text: 'The publishing model',
          //       link: '/explanation/concepts/publishing-model',
          //     },
          //   ],
          // },
          // {
          //   text: 'Design Decisions',
          //   items: [
          //     {
          //       text: 'Why we chose this tech stack',
          //       link: '/explanation/decisions/tech-stack',
          //     },
          //     {
          //       text: 'API design principles',
          //       link: '/explanation/decisions/api-design',
          //     },
          //     {
          //       text: 'Database design rationale',
          //       link: '/explanation/decisions/database-design',
          //     },
          //   ],
          // },
          {
            text: 'Application Data Flow',
            items: [
              {
                text: 'Understanding Data Flow',
                link: '/explanation/data-flow/',
              },
              {
                text: 'Application Startup',
                link: '/explanation/data-flow/application-startup',
              },
              {
                text: 'Panel Entry Flow',
                link: '/explanation/data-flow/panel-entry-flow',
              },
              {
                text: 'Real-time Updates',
                link: '/explanation/data-flow/real-time-updates',
              },
              {
                text: 'Authentication Flow',
                link: '/explanation/data-flow/authentication-flow',
              },
              {
                text: 'State Management',
                link: '/explanation/data-flow/state-management',
              },
            ],
          },
        ],

        '/projects/': [
          {
            text: 'Monorepo Overview',
            items: [{ text: 'Project Structure', link: '/projects/' }],
          },
          {
            text: 'Frontend (App)',
            items: [
              { text: 'Overview', link: '/projects/app/' },
              { text: 'Components', link: '/projects/app/components' },
              {
                text: 'State Management',
                link: '/projects/app/state-management',
              },
            ],
          },
          {
            text: 'Backend (Services)',
            items: [
              { text: 'Overview', link: '/projects/services/' },
              { text: 'Modules', link: '/projects/services/modules' },
              { text: 'Testing', link: '/projects/services/testing' },
            ],
          },
          {
            text: 'Shared Types',
            items: [
              { text: 'Overview', link: '/projects/types/' },
              { text: 'Schema Design', link: '/projects/types/schema-design' },
            ],
          },
          {
            text: 'Documentation',
            items: [
              { text: 'Overview', link: '/projects/docs/' },
              { text: 'Contributing', link: '/projects/docs/contributing' },
            ],
          },
        ],

        '/examples/': [
          {
            text: 'Basic Usage',
            items: [
              {
                text: 'Create Panel',
                link: '/examples/basic-usage/create-panel',
              },
              {
                text: 'Add Columns',
                link: '/examples/basic-usage/add-columns',
              },
              { text: 'Build View', link: '/examples/basic-usage/build-view' },
            ],
          },
          {
            text: 'Advanced Patterns',
            items: [
              {
                text: 'Formula Examples',
                link: '/examples/advanced-patterns/formula-examples',
              },
              {
                text: 'Filter Combinations',
                link: '/examples/advanced-patterns/filter-combinations',
              },
              {
                text: 'API Integration',
                link: '/examples/advanced-patterns/api-integration',
              },
            ],
          },
          {
            text: 'Code Samples',
            items: [
              {
                text: 'React Components',
                link: '/examples/code-samples/react-components',
              },
              {
                text: 'Error Handling',
                link: '/examples/code-samples/error-handling',
              },
              { text: 'Testing', link: '/examples/code-samples/testing' },
            ],
          },
        ],
      },

      socialLinks: [
        { icon: 'github', link: 'https://github.com/vuejs/vitepress' },
      ],

      search: {
        provider: 'local',
      },

      footer: {
        message: 'Released under the Apache License 2.0.',
        copyright: 'Copyright © 2024 Awell Health',
      },
    },
  }),
)

//export default
