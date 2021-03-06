import {mount, unmountAll} from 'app/Testing';
import * as React from 'react';
import SplashScreen, { Props } from './SplashScreen';
import {initialSettings} from '../../reducers/Settings';
import {initialMultiplayer} from '../../reducers/Multiplayer';
import {loggedOutUser} from 'shared/auth/UserState';

jest.useFakeTimers();

describe('SplashScreen', () => {
  afterEach(unmountAll);

  function setup(overrides?: Partial<Props>) {
    const props: Props = {
      announcement: null,
      onAnnouncementTap: jest.fn(),
      onPlayerCountSelect: jest.fn(),
      onPlayerManualSelect: jest.fn(),
      ...overrides,
    };
    const e = mount(<SplashScreen {...props} />);
    return {e, props};
  }

  test('Calls onPlayerCountSelect on tap and hold', () => {
    const {e, props} = setup();
    const mtt = e.find('MultiTouchTrigger');
    mtt.prop('onTouchChange')(3);
    jest.runOnlyPendingTimers();
    expect(props.onPlayerCountSelect).toHaveBeenCalledWith(3);
  });

  test('Clears player count select timeout when component unmounts', () => {
    const {e, props} = setup();
    const mtt = e.find('MultiTouchTrigger');
    mtt.prop('onTouchChange')(1);
    unmountAll();
    jest.runOnlyPendingTimers();
    expect(props.onPlayerCountSelect).not.toHaveBeenCalled();
  }
});
