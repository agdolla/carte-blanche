import React, { cloneElement } from 'react';
import cloneDeep from 'lodash/cloneDeep';
import range from 'lodash/range';
import first from 'lodash/first';
import isUndefined from 'lodash/isUndefined';
import isNull from 'lodash/isNull';
import randomValue from './randomValue';
import getControl from '../../../../utils/getControl';
import ConstraintsForm from './ConstraintsForm';
import Row from '../../../form/Grid/Row';
import LeftColumn from '../../../form/Grid/LeftColumn';
import RightColumn from '../../../form/Grid/RightColumn';
import Label from '../../../form/Label';
import Button from '../../../form/Button';
import RandomButton from '../../../form/RandomButton';
import SettingsButton from '../../../form/SettingsButton';
import BaseSettings from '../../../form/BaseSettings';
import Dropdown from '../../../form/Dropdown';

class ArrayControl extends React.Component {

  state = {
    settingsActive: false,
  }

  onToggleSettings = () => {
    this.setState({
      settingsActive: !this.state.settingsActive,
    });
  }

  onCloseSettings = () => {
    this.setState({
      settingsActive: false,
    });
  };

  render() {
    const {
      label,
      secondaryLabel,
      propTypeData,
      value,
      onUpdate,
      nestedLevel,
      required,
    } = this.props;

    const hasSettings = true;
    const size = isNull(value) || isUndefined(value) ? 0 : this.props.value.length;
    const rangeArray = range(size);

    const onUpdateEntry = (data, index) => {
      const newValue = cloneDeep(value);
      newValue[index] = data;
      onUpdate({ value: newValue });
    };

    // override propTypeData. make sure required is set to true
    const requiredPropTypeData = { ...propTypeData, required: true };
    const addItem = () => ({ value: [...value || [], first(ArrayControl.randomValue(requiredPropTypeData))] }); // eslint-disable-line max-len
    const removeItem = () => ({ value: size > 0 ? [...value.slice(0, size - 1)] : [] });

    const control = getControl(propTypeData.value);

    return (
      <Row>
        <LeftColumn nestedLevel={nestedLevel}>
          <Label
            type={secondaryLabel}
            propKey={label}
          />
        </LeftColumn>
        <RightColumn>
          <div style={{ padding: '0 0.5rem', textAlign: 'right' }}>
            {hasSettings && <Dropdown
              active={this.state.settingsActive}
              onClose={this.onCloseSettings}
            >
              <BaseSettings onChange={onUpdate} />
            </Dropdown>}
            {!required && <SettingsButton
              groupType="left"
              onClick={this.onToggleSettings}
            />}
            <Button
              groupType={required ? 'left' : 'center'}
              onClick={() => onUpdate(removeItem())}
              disabled={size <= 0}
            >
              -
            </Button>
            <Button
              onClick={() => onUpdate(addItem())}
              groupType="center"
            >
              +
            </Button>
            <RandomButton
              onClick={() => onUpdate({ value: ArrayControl.randomValue(propTypeData) })}
            />
          </div>
        </RightColumn>
        <Row>
          {rangeArray && rangeArray.map((index) => {
            const newProps = {
              key: index,
              value: value[index],
              onUpdate: (data) => onUpdateEntry(data.value, index),
              nestedLevel: nestedLevel + 1,
            };
            return cloneElement(control, newProps);
          })}
        </Row>
      </Row>
    );
  }
}

ArrayControl.randomValue = randomValue;
/**
 * The form to manage the types of the array's children.
 */
ArrayControl.ConstraintsForm = ConstraintsForm;


export default ArrayControl;
