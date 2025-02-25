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
    description: '';
  };
  attributes: {
    href: Schema.Attribute.String & Schema.Attribute.Required;
    label: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface UtilsComponentsImage extends Struct.ComponentSchema {
  collectionName: 'components_utils_components_images';
  info: {
    displayName: 'Image';
    icon: 'picture';
  };
  attributes: {
    image: Schema.Attribute.Media<'images'> & Schema.Attribute.Required;
    alt: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface UtilsComponentsHoursOverviewItem
  extends Struct.ComponentSchema {
  collectionName: 'components_utils_components_hours_overview_items';
  info: {
    displayName: 'HoursOverviewItem';
    icon: 'bulletList';
  };
  attributes: {
    title: Schema.Attribute.String & Schema.Attribute.Required;
    desc: Schema.Attribute.Blocks & Schema.Attribute.Required;
    icon: Schema.Attribute.Component<'utils-components.image', false> &
      Schema.Attribute.Required;
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

export interface PageComponentsTitleDescBlock extends Struct.ComponentSchema {
  collectionName: 'components_page_components_title_desc_blocks';
  info: {
    displayName: 'TitleDescBlock';
    icon: 'underline';
    description: '';
  };
  attributes: {
    title: Schema.Attribute.String & Schema.Attribute.Required;
    desc: Schema.Attribute.Blocks & Schema.Attribute.Required;
    epigraph: Schema.Attribute.String;
    size: Schema.Attribute.Enumeration<['sm', 'md', 'lg', 'full']> &
      Schema.Attribute.DefaultTo<'md'>;
    align: Schema.Attribute.Enumeration<['center', 'start']> &
      Schema.Attribute.DefaultTo<'center'>;
    caseStyle: Schema.Attribute.Enumeration<
      ['normal', 'capitalize', 'uppercase', 'lowercase']
    > &
      Schema.Attribute.DefaultTo<'normal'>;
    flexdir: Schema.Attribute.Enumeration<['col', 'row']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'col'>;
    className: Schema.Attribute.Text;
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

export interface PageComponentsImageTextBlock extends Struct.ComponentSchema {
  collectionName: 'components_page_components_image_text_blocks';
  info: {
    displayName: 'ImageTextBlock';
    icon: 'layout';
    description: '';
  };
  attributes: {
    title: Schema.Attribute.String & Schema.Attribute.Required;
    isInverted: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    isHighlighted: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    variant: Schema.Attribute.Enumeration<
      [
        'default',
        'defaultFW',
        'panoramic',
        'panoramicFW',
        'horizontal',
        'ladder',
        'miniatures',
      ]
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'default'>;
    link: Schema.Attribute.Component<'utils-components.link', false>;
    images: Schema.Attribute.Component<'utils-components.image', true> &
      Schema.Attribute.Required;
    description: Schema.Attribute.Blocks & Schema.Attribute.Required;
    epigraph: Schema.Attribute.Text;
  };
}

export interface PageComponentsHoursOverview extends Struct.ComponentSchema {
  collectionName: 'components_page_components_hours_overviews';
  info: {
    displayName: 'HoursOverview';
    icon: 'clock';
    description: '';
  };
  attributes: {
    withTextBlock: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
  };
}

export interface PageComponentsHero extends Struct.ComponentSchema {
  collectionName: 'components_page_components_heroes';
  info: {
    displayName: 'Hero';
    icon: 'picture';
    description: '';
  };
  attributes: {
    title: Schema.Attribute.String;
    description: Schema.Attribute.Text;
    firstLink: Schema.Attribute.Component<'utils-components.link', false>;
    secondLink: Schema.Attribute.Component<'utils-components.link', false>;
    cover: Schema.Attribute.Component<'utils-components.image', false>;
    align: Schema.Attribute.Enumeration<['bottom', 'center']> &
      Schema.Attribute.DefaultTo<'bottom'>;
    logo: Schema.Attribute.Component<'utils-components.image', false>;
  };
}

export interface PageComponentsFaqSection extends Struct.ComponentSchema {
  collectionName: 'components_page_components_faq_sections';
  info: {
    displayName: 'FaqSection';
    icon: 'bulletList';
  };
  attributes: {
    favs: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<false>;
  };
}

export interface GlobalIntlComponentsPolicies extends Struct.ComponentSchema {
  collectionName: 'components_global_intl_components_policies';
  info: {
    displayName: 'Policies';
    icon: 'book';
  };
  attributes: {
    policies: Schema.Attribute.Blocks & Schema.Attribute.Required;
  };
}

export interface GlobalIntlComponentsNavbar extends Struct.ComponentSchema {
  collectionName: 'components_global_intl_components_navbars';
  info: {
    displayName: 'Navbar';
    icon: 'filter';
    description: '';
  };
  attributes: {
    items: Schema.Attribute.Component<'utils-components.link', true> &
      Schema.Attribute.Required;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'utils-components.title': UtilsComponentsTitle;
      'utils-components.service-states': UtilsComponentsServiceStates;
      'utils-components.link': UtilsComponentsLink;
      'utils-components.image': UtilsComponentsImage;
      'utils-components.hours-overview-item': UtilsComponentsHoursOverviewItem;
      'page-properties.seo': PagePropertiesSeo;
      'page-properties.metat-tag': PagePropertiesMetatTag;
      'page-components.title-desc-block': PageComponentsTitleDescBlock;
      'page-components.service-state-modal': PageComponentsServiceStateModal;
      'page-components.image-text-block': PageComponentsImageTextBlock;
      'page-components.hours-overview': PageComponentsHoursOverview;
      'page-components.hero': PageComponentsHero;
      'page-components.faq-section': PageComponentsFaqSection;
      'global-intl-components.policies': GlobalIntlComponentsPolicies;
      'global-intl-components.navbar': GlobalIntlComponentsNavbar;
    }
  }
}
