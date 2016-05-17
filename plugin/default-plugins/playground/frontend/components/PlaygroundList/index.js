/**
 * Playground Store
 */

import React, { Component } from 'react';
import map from 'lodash/map';
import mapValues from 'lodash/mapValues';
import find from 'lodash/find';
import 'whatwg-fetch';
import getSlug from 'speakingurl';

import getControl from '../../utils/getControl';
import randomValues from '../../utils/randomValues';
import propsToVariation from '../../utils/propsToVariation';
import variationsToProps from '../../utils/variationsToProps';
import convertCodeToMetaData from '../../utils/convertCodeToMetaData';
import getComponentNameFromPath from '../../../../../../utils/getComponentNameFromPath';

import Playground from '../Playground';
import PropForm from '../PropForm';
import Modal from '../Modal';
import CreateVariationButton from '../common/CreateVariationButton';

import styles from './styles.css';

const PERSISTENCE_DELAY = 1000;
let PERSISTENCE_TIMEOUT;

class PlaygroundList extends Component {
  state = {
    variationPropsList: {},
    selected: undefined,
    metaData: undefined,
    metadataWithControls: null,
    editMode: false,
    createVariationError: '',
    loadingMetaData: true,
    loadingVariations: true,
  };

  componentWillMount() {
    this.fetchMetaData();
    this.fetchVariations();
  }

  getRandomValues = () => randomValues(this.state.metadataWithControls);

  getDataFromProps = (data) => {
    const {
      props,
      name,
    } = data;
    // Generate a human-readable JSON string from the props
    const propsString = propsToVariation(props);
    // Add the name to the data we save
    return propsString.replace(/^(\s*){/, `$1{\n  "name": "${name}",`);
  };

  fetchMetaData = () => {
    // TODO dynamic host
    fetch(`http://localhost:8000/components/${this.props.componentPath}`)
      .then((response) => response.json())
      .then((json) => {
        const metaData = convertCodeToMetaData(json.data);
        this.generateMetadataWithControls(metaData);
      }).catch((ex) => {
        // TODO proper error handling
        console.error('meta data parsing failed', ex); // eslint-disable-line no-console
      });
  };

  generateMetadataWithControls = (metaData) => {
    const { meta } = this.props;

    // Attach controls to propTypes meta information
    let metadataWithControls;
    if (meta.props) {
      metadataWithControls = mapValues(meta.props, (prop, propKey) => {
        const newProp = { ...prop };
        const propMeta = metaData && metaData.props ? metaData.props[propKey] : undefined;
        newProp.control = getControl(newProp, propMeta);
        return newProp;
      });
    }

    this.setState({
      metadataWithControls,
      metaData,
      loadingMetaData: false,
    });
  };

  fetchVariations = () => {
    // TODO dynamic host
    fetch(`http://localhost:8000/variations/${this.props.componentPath}`)
      .then((response) => response.json())
      .then((json) => {
        const variationPropsList = variationsToProps(json.data);
        this.setState({
          variationPropsList,
          loadingVariations: false,
        });

        const links = map(variationPropsList, (variation, key) => (
          {
            title: variation.name,
            id: key,
          }
        ));

        window.STYLEGUIDE_PLUGIN_CLIENT_API.updateNavigation(
          this.props.componentPath,
          'playground-plugin',
          links
        );
      }).catch((ex) => {
        // TODO proper error handling
        console.error('parsing failed', ex); // eslint-disable-line no-console
      });
  };

  createVariation = (name) => {
    const slug = getSlug(name);
    if (this.state.variationPropsList[`${slug}`] !== undefined) {
      this.setState({
        createVariationError: `A variation with the name ${name} already exists.`,
      });
      return;
    }
    this.setState({
      createVariationError: '',
    });
    const data = this.getDataFromProps({
      props: this.getRandomValues(),
      name,
    });
    // TODO dynamic host
    fetch(`http://localhost:8000/variations/${this.props.componentPath}`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        variation: `${slug}`,
        code: data,
      }),
    })
      .then(() => {
        // TODO only fetch in case there was a 200 response (should we switch to 201?)
        this.fetchVariations();
      }).catch((err) => {
        // TODO proper error handling
        console.error('parsing failed', err); // eslint-disable-line no-console
      });
  };

  deleteVariation = (variationPath) => {
    fetch(`http://localhost:8000/variations/${this.props.componentPath}?variation=${variationPath}`, {
      method: 'DELETE',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    })
    .then(() => {
      this.setState({
        editMode: false,
      });
      this.fetchVariations();
    })
    .catch((err) => {
      // TODO PROPER ERROR HANDLING
      console.trace(err); // eslint-disable-line no-console
    });
  };

  persistVariationUpdate = (variationPath, props) => {
    const data = this.getDataFromProps({
      props,
      name: this.state.variationPropsList[variationPath].name,
    });
    fetch(`http://localhost:8000/variations/${this.props.componentPath}`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        variation: `${variationPath}`,
        code: data,
      }),
    })
    .then(() => {
      this.fetchVariations();
    })
    .catch((err) => {
      // TODO PROPER ERROR HANDLING
      console.trace(err); // eslint-disable-line no-console
    });
  };

  updateVariation = (variationPath, props) => {
    // Update changes locally for snappy UI
    this.setState({
      variationPropsList: {
        ...this.state.variationPropsList,
        [variationPath]: {
          ...this.state.variationPropsList[variationPath],
          props,
        },
      },
    });
    // Persist changes to server every PERSISTENCE_TIMEOUT milliseconds
    clearTimeout(PERSISTENCE_TIMEOUT);
    PERSISTENCE_TIMEOUT = setTimeout(() => {
      this.persistVariationUpdate(variationPath, props);
    }, PERSISTENCE_DELAY);
  };

  randomiseEverything = (path) => {
    this.persistVariationUpdate(path, this.getRandomValues());
  };

  selectVariation = (id) => {
    this.setState({
      selected: id,
    });
  };

  startEditMode = (id) => {
    document.body.style.overflow = 'hidden';
    this.setState({
      editMode: true,
      selected: id,
    });
  };

  stopEditMode = () => {
    document.body.style.overflow = '';
    this.setState({
      editMode: false,
    });
  };

  render() {
    if (this.state.loadingMetaData && this.state.loadingVariations) {
      return <div>Loading …</div>;
    }

    const { component } = this.props;
    const selectedVariation =
      find(
        this.state.variationPropsList,
        (variationProps, key) => this.state.selected === key
      );
    return (
      <div className={styles.wrapper}>
        <h2 className={styles.title}>
          {getComponentNameFromPath(this.props.componentPath)}
        </h2>
        {/* EDIT MODE MODAL */}
        {(this.state.selected) ? (
          <Modal
            visible={this.state.editMode}
            onCloseClick={this.stopEditMode}
          >
            <div className={styles.modalWrapper}>
              <PropForm
                metadataWithControls={this.state.metadataWithControls}
                onVariationPropsChange={this.updateVariation}
                onRandomClick={this.randomiseEverything.bind(this, this.state.selected)} // eslint-disable-line react/jsx-no-bind,max-len
                open={this.state.editMode}
                variationPath={this.state.selected}
                variationProps={selectedVariation.props}
              />
              <Playground
                component={component}
                fullHeight
                variationProps={selectedVariation.props}
                variationPath={this.state.selected}
              />
            </div>
          </Modal>
        ) : null}
        {/* MAIN AREA WITH PLAYGROUNDS */}
        {map(this.state.variationPropsList, (variation, variationPath) => (
          <Playground
            key={variationPath}
            component={component}
            title={variation.name}
            variationProps={variation.props}
            variationPath={variationPath}
            onDeleteButtonClick={this.deleteVariation}
            onEditButtonClick={this.startEditMode}
          />
        ))}
        <CreateVariationButton
          error={this.state.createVariationError}
          onSubmit={this.createVariation}
        />
      </div>
    );
  }
}

export default PlaygroundList;