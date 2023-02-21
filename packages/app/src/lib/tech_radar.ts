import {
  RadarRing,
  RadarQuadrant,
  RadarEntry,
  TechRadarApi,
  TechRadarLoaderResponse,
} from '@backstage/plugin-tech-radar';

const rings = new Array<RadarRing>();
rings.push({ id: 'adopt', name: 'Use', color: '#93c47d' });
rings.push({ id: 'trial', name: 'Try', color: '#93d2c2' });
rings.push({ id: 'assess', name: 'Experimental', color: '#fbdb84' });
rings.push({ id: 'hold', name: 'No Use', color: '#efafa9' });

const quadrants = new Array<RadarQuadrant>();
quadrants.push({ id: 'infrastructure', name: 'Infrastructure' });
quadrants.push({ id: 'frameworks', name: 'Frameworks' });
quadrants.push({ id: 'languages', name: 'Languages' });
quadrants.push({ id: 'process', name: 'Process' });

const entries = new Array<RadarEntry>();
entries.push({
  timeline: [
    {
      moved: 0,
      ringId: 'adopt',
      date: new Date('2020-08-06'),
    },
  ],
  url: 'https://python.org',
  key: 'python',
  id: 'python',
  title: 'Python',
  quadrant: 'languages',
});
entries.push({
  timeline: [
    {
      moved: 0,
      ringId: 'hold',
      date: new Date('2020-08-06'),
    },
  ],
  url: 'https://python.org',
  key: 'python2',
  id: 'python2',
  title: 'Python v2',
  quadrant: 'languages',
});

entries.push({
  timeline: [
    {
      moved: 0,
      ringId: 'adopt',
      date: new Date('2020-08-06'),
    },
  ],
  url: 'https://rust.org',
  key: 'rust',
  id: 'rust',
  title: 'Rust',
  quadrant: 'languages',
});
entries.push({
  timeline: [
    {
      moved: 1,
      ringId: 'adopt',
      date: new Date('2020-08-06'),
      description:
        'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur',
    },
  ],
  url: 'https://webpack.js.org/',
  key: 'webpack',
  id: 'webpack',
  title: 'Webpack',
  quadrant: 'frameworks',
});
entries.push({
  timeline: [
    {
      moved: 0,
      ringId: 'adopt',
      date: new Date('2020-08-06'),
    },
  ],
  url: 'https://reactjs.org/',
  key: 'react',
  id: 'react',
  title: 'React',
  quadrant: 'frameworks',
});
entries.push({
  timeline: [
    {
      moved: 0,
      ringId: 'adopt',
      date: new Date('2020-08-06'),
    },
  ],
  url: '#',
  key: 'code-reviews',
  id: 'code-reviews',
  title: 'Code Reviews',
  quadrant: 'process',
});
entries.push({
  timeline: [
    {
      moved: 0,
      ringId: 'assess',
      date: new Date('2020-08-06'),
    },
  ],
  url: '#',
  key: 'mob-programming',
  id: 'mob-programming',
  title: 'Mob Programming',
  quadrant: 'process',
});
entries.push({
  timeline: [
    {
      moved: 0,
      ringId: 'adopt',
      date: new Date('2020-08-06'),
    },
  ],
  url: '#',
  key: 'docs-like-code',
  id: 'docs-like-code',
  title: 'Docs-like-code',
  quadrant: 'process',
});
entries.push({
  timeline: [
    {
      ringId: 'hold',
      date: new Date('2020-08-06'),
    },
  ],
  url: '#',
  key: 'force-push',
  id: 'force-push',
  title: 'Force push to master',
  quadrant: 'process',
});
entries.push({
  timeline: [
    {
      ringId: 'adopt',
      date: new Date('2020-08-06'),
      description: 'Zuul is a CI/CD of choice',
    },
  ],
  url: 'https://zuul-ci.otc-service.com',
  key: 'zuul',
  id: 'zuul',
  title: 'Zuul CI/CD',
  quadrant: 'infrastructure',
});

entries.push({
  timeline: [
    {
      ringId: 'hold',
      date: new Date('2020-08-06'),
      description: 'GitHub Actions are not flexible',
    },
  ],
  url: 'https://github.com',
  key: 'github-actions',
  id: 'github-actions',
  title: 'GitHub Actions',
  quadrant: 'infrastructure',
});

export const mock: TechRadarLoaderResponse = {
  entries,
  quadrants,
  rings,
};

export class TechRadarClient implements TechRadarApi {
  async load() {
    return mock;
  }

  //  async load(id: string | undefined): Promise<TechRadarLoaderResponse> {
  //    // if needed id prop can be used to fetch the correct data
  //
  //    const data = self.data;
  //    //await fetch('https://mydata.json').then(res => res.json());
  //
  //    // For example, this converts the timeline dates into date objects
  //    return {
  //      ...data,
  //      entries: data.entries.map(entry => ({
  //        ...entry,
  //        timeline: entry.timeline.map(timeline => ({
  //          ...timeline,
  //          date: new Date(timeline.date),
  //        })),
  //      })),
  //    };
  //  }
}
