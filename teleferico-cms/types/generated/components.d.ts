import type { Struct, Schema } from '@strapi/strapi';

export interface UtilsComponentsTitle extends Struct.ComponentSchema {
  collectionName: 'components_utils_components_titles';
  info: {
    displayName: 'State Title';
    icon: 'italic';
    description: '';
  };
  attributes: {
    title: Schema.Attribute.String & Schema.Attribute.Required;
    state: Schema.Attribute.Component<'utils-components.service-states', false>;
  };
}

export interface UtilsComponentsServiceStates extends Struct.ComponentSchema {
  collectionName: 'components_utils_components_service_states';
  info: {
    displayName: 'ServiceStates';
    icon: 'bulletList';
    description: '';
  };
  attributes: {
    name: Schema.Attribute.Enumeration<
      ['normal', 'conditional', 'restricted', 'suspended', 'closed']
    > &
      Schema.Attribute.Required;
  };
}

export interface UtilsComponentsLink extends Struct.ComponentSchema {
  collectionName: 'components_utils_components_links';
  info: {
    displayName: 'Link';
    icon: 'link';
  };
  attributes: {
    href: Schema.Attribute.String;
    label: Schema.Attribute.String;
  };
}

export interface PagePropertiesSeo extends Struct.ComponentSchema {
  collectionName: 'components_page_properties_seos';
  info: {
    displayName: 'SEO';
    icon: 'search';
    description: '';
  };
  attributes: {
    MetaTitle: Schema.Attribute.String;
    MetaDescription: Schema.Attribute.Text;
    MetaTag: Schema.Attribute.Component<'page-properties.metat-tag', true>;
  };
}

export interface PagePropertiesMetatTag extends Struct.ComponentSchema {
  collectionName: 'components_page_properties_metat_tags';
  info: {
    displayName: 'MetatTag';
    icon: 'priceTag';
  };
  attributes: {
    name: Schema.Attribute.String;
    content: Schema.Attribute.Text;
  };
}

export interface PageComponentsServiceStateModal
  extends Struct.ComponentSchema {
  collectionName: 'components_page_components_service_state_modals';
  info: {
    displayName: 'ServiceStateModal';
    icon: 'chartBubble';
    description: '';
  };
  attributes: {
    help: Schema.Attribute.Text & Schema.Attribute.Required;
    stateList: Schema.Attribute.Component<'utils-components.title', true> &
      Schema.Attribute.Required;
    description: Schema.Attribute.Blocks & Schema.Attribute.Required;
  };
}

export interface PageComponentsNewPreview extends Struct.ComponentSchema {
  collectionName: 'components_page_components_new_previews';
  info: {
    displayName: 'NewPreview';
    icon: 'eye';
  };
  attributes: {
    description: Schema.Attribute.String & Schema.Attribute.Required;
    previewTitle: Schema.Attribute.Text & Schema.Attribute.Required;
    cover: Schema.Attribute.Media<'images'> & Schema.Attribute.Required;
  };
}

export interface PageComponentsImageTextBlock extends Struct.ComponentSchema {
  collectionName: 'components_page_components_image_text_blocks';
  info: {
    displayName: 'ImageTextBlock';
    icon: 'layout';
    description: '';
  };
  attributes: {
    title: Schema.Attribute.String & Schema.Attribute.Required;
    description: Schema.Attribute.Text & Schema.Attribute.Required;
    images: Schema.Attribute.Media<'images' | 'files', true> &
      Schema.Attribute.Required;
    isInverted: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    isHighlighted: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    variant: Schema.Attribute.Enumeration<
      [
        'default',
        'defaultFW',
        'panoramic',
        'horizontal',
        'ladder',
        'miniatures',
      ]
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'default'>;
    link: Schema.Attribute.Component<'utils-components.link', false>;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'utils-components.title': UtilsComponentsTitle;
      'utils-components.service-states': UtilsComponentsServiceStates;
      'utils-components.link': UtilsComponentsLink;
      'page-properties.seo': PagePropertiesSeo;
      'page-properties.metat-tag': PagePropertiesMetatTag;
      'page-components.service-state-modal': PageComponentsServiceStateModal;
      'page-components.new-preview': PageComponentsNewPreview;
      'page-components.image-text-block': PageComponentsImageTextBlock;
    }
  }
}
