import type { Schema, Struct } from '@strapi/strapi';

export interface PageComponentsCarrousel extends Struct.ComponentSchema {
  collectionName: 'components_page_components_carrousels';
  info: {
    displayName: 'Carrousel';
    icon: 'medium';
  };
  attributes: {
    autoplayMs: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0>;
    items: Schema.Attribute.Component<'utils-components.carrousel-item', true> &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          max: 15;
          min: 1;
        },
        number
      >;
    pauseOnHover: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<true>;
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

export interface PageComponentsHero extends Struct.ComponentSchema {
  collectionName: 'components_page_components_heroes';
  info: {
    description: '';
    displayName: 'Hero';
    icon: 'picture';
  };
  attributes: {
    align: Schema.Attribute.Enumeration<['bottom', 'center']> &
      Schema.Attribute.DefaultTo<'bottom'>;
    cover: Schema.Attribute.Component<'utils-components.image', false> &
      Schema.Attribute.Required;
    description: Schema.Attribute.Text;
    firstLink: Schema.Attribute.Component<'utils-components.link', false>;
    logo: Schema.Attribute.Component<'utils-components.image', false>;
    secondLink: Schema.Attribute.Component<'utils-components.link', false>;
    title: Schema.Attribute.String;
  };
}

export interface PageComponentsHoursOverview extends Struct.ComponentSchema {
  collectionName: 'components_page_components_hours_overviews';
  info: {
    description: '';
    displayName: 'HoursOverview';
    icon: 'eye';
  };
  attributes: {
    withTextBlock: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
  };
}

export interface PageComponentsImageTextBlock extends Struct.ComponentSchema {
  collectionName: 'components_page_components_image_text_blocks';
  info: {
    description: '';
    displayName: 'ImageTextBlock';
    icon: 'layout';
  };
  attributes: {
    bgColor: Schema.Attribute.Enumeration<['none', 'gray']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'none'>;
    description: Schema.Attribute.Blocks & Schema.Attribute.Required;
    epigraph: Schema.Attribute.Text;
    images: Schema.Attribute.Component<'utils-components.image', true> &
      Schema.Attribute.Required;
    isHighlighted: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    isInverted: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    link: Schema.Attribute.Component<'utils-components.link', false>;
    title: Schema.Attribute.String & Schema.Attribute.Required;
    titleCase: Schema.Attribute.Enumeration<
      ['normal', 'uppercase', 'lowercase', 'capitalize']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'normal'>;
    variant: Schema.Attribute.Enumeration<
      [
        'single',
        'poster',
        'card',
        'panoramic',
        'spotlight',
        'double',
        'cascade',
        'horizontal',
        'masonry',
        'ladder',
        'miniatures',
      ]
    > &
      Schema.Attribute.Required;
  };
}

export interface PageComponentsSchedules extends Struct.ComponentSchema {
  collectionName: 'components_page_components_schedules';
  info: {
    displayName: 'Schedules';
    icon: 'clock';
  };
  attributes: {};
}

export interface PageComponentsServiceStatusButton
  extends Struct.ComponentSchema {
  collectionName: 'components_page_components_service_status_buttons';
  info: {
    displayName: 'ServiceStatusButton';
    icon: 'information';
  };
  attributes: {};
}

export interface PageComponentsSpacer extends Struct.ComponentSchema {
  collectionName: 'components_page_components_spacers';
  info: {
    displayName: 'Spacer';
    icon: 'collapse';
  };
  attributes: {
    xSpace: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          max: 96;
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0>;
    ySpace: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          max: 96;
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0>;
  };
}

export interface PageComponentsTitleDescBlock extends Struct.ComponentSchema {
  collectionName: 'components_page_components_title_desc_blocks';
  info: {
    description: '';
    displayName: 'TitleDescBlock';
    icon: 'underline';
  };
  attributes: {
    align: Schema.Attribute.Enumeration<['center', 'start']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'center'>;
    bgColor: Schema.Attribute.Enumeration<['none', 'gray']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'none'>;
    desc: Schema.Attribute.Blocks & Schema.Attribute.Required;
    epigraph: Schema.Attribute.String;
    flexdir: Schema.Attribute.Enumeration<['col', 'row']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'col'>;
    size: Schema.Attribute.Enumeration<['sm', 'md', 'lg', 'full']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'md'>;
    title: Schema.Attribute.String & Schema.Attribute.Required;
    titleCase: Schema.Attribute.Enumeration<
      ['normal', 'capitalize', 'uppercase', 'lowercase']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'normal'>;
  };
}

export interface PagePropertiesMetatTag extends Struct.ComponentSchema {
  collectionName: 'components_page_properties_metat_tags';
  info: {
    displayName: 'MetatTag';
    icon: 'priceTag';
  };
  attributes: {
    content: Schema.Attribute.Text;
    name: Schema.Attribute.String;
  };
}

export interface PagePropertiesSeo extends Struct.ComponentSchema {
  collectionName: 'components_page_properties_seos';
  info: {
    description: '';
    displayName: 'SEO';
    icon: 'search';
  };
  attributes: {
    MetaDescription: Schema.Attribute.Text;
    MetaTag: Schema.Attribute.Component<'page-properties.metat-tag', true>;
    MetaTitle: Schema.Attribute.String;
  };
}

export interface UtilsComponentsCarrouselItem extends Struct.ComponentSchema {
  collectionName: 'components_utils_components_carrousel_items';
  info: {
    displayName: 'Carrousel Item';
    icon: 'bulletList';
  };
  attributes: {
    cover: Schema.Attribute.Component<'utils-components.image', false> &
      Schema.Attribute.Required;
    description: Schema.Attribute.Blocks;
    epigraph: Schema.Attribute.Text;
    label: Schema.Attribute.String & Schema.Attribute.Private;
    link: Schema.Attribute.Component<'utils-components.link', false>;
    title: Schema.Attribute.Text;
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
    desc: Schema.Attribute.Blocks & Schema.Attribute.Required;
    icon: Schema.Attribute.Component<'utils-components.image', false> &
      Schema.Attribute.Required;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface UtilsComponentsImage extends Struct.ComponentSchema {
  collectionName: 'components_utils_components_images';
  info: {
    displayName: 'Image';
    icon: 'picture';
  };
  attributes: {
    alt: Schema.Attribute.String & Schema.Attribute.Required;
    image: Schema.Attribute.Media<'images'> & Schema.Attribute.Required;
  };
}

export interface UtilsComponentsLink extends Struct.ComponentSchema {
  collectionName: 'components_utils_components_links';
  info: {
    description: '';
    displayName: 'Link';
    icon: 'link';
  };
  attributes: {
    href: Schema.Attribute.String & Schema.Attribute.Required;
    label: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface UtilsComponentsServiceStates extends Struct.ComponentSchema {
  collectionName: 'components_utils_components_service_states';
  info: {
    description: '';
    displayName: 'ServiceStates';
    icon: 'bulletList';
  };
  attributes: {
    name: Schema.Attribute.Enumeration<
      ['normal', 'conditional', 'restricted', 'suspended', 'closed']
    > &
      Schema.Attribute.Required;
  };
}

export interface UtilsComponentsTitle extends Struct.ComponentSchema {
  collectionName: 'components_utils_components_titles';
  info: {
    description: '';
    displayName: 'State Title';
    icon: 'italic';
  };
  attributes: {
    state: Schema.Attribute.Component<'utils-components.service-states', false>;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'page-components.carrousel': PageComponentsCarrousel;
      'page-components.faq-section': PageComponentsFaqSection;
      'page-components.hero': PageComponentsHero;
      'page-components.hours-overview': PageComponentsHoursOverview;
      'page-components.image-text-block': PageComponentsImageTextBlock;
      'page-components.schedules': PageComponentsSchedules;
      'page-components.service-status-button': PageComponentsServiceStatusButton;
      'page-components.spacer': PageComponentsSpacer;
      'page-components.title-desc-block': PageComponentsTitleDescBlock;
      'page-properties.metat-tag': PagePropertiesMetatTag;
      'page-properties.seo': PagePropertiesSeo;
      'utils-components.carrousel-item': UtilsComponentsCarrouselItem;
      'utils-components.hours-overview-item': UtilsComponentsHoursOverviewItem;
      'utils-components.image': UtilsComponentsImage;
      'utils-components.link': UtilsComponentsLink;
      'utils-components.service-states': UtilsComponentsServiceStates;
      'utils-components.title': UtilsComponentsTitle;
    }
  }
}
