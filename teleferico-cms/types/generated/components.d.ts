import type { Schema, Struct } from '@strapi/strapi';

export interface ImagesBlocksOneImage extends Struct.ComponentSchema {
  collectionName: 'components_images_blocks_one_images';
  info: {
    displayName: 'OneImageBlock';
  };
  attributes: {
    desktopImages: Schema.Attribute.Component<'utils-components.image', true> &
      Schema.Attribute.SetMinMax<
        {
          max: 1;
          min: 1;
        },
        number
      >;
    mobileImages: Schema.Attribute.Component<'utils-components.image', true> &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          max: 1;
          min: 1;
        },
        number
      >;
    variant: Schema.Attribute.Enumeration<
      ['single', 'poster', 'card', 'panoramic', 'spotlight']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'single'>;
  };
}

export interface ImagesBlocksThreeImages extends Struct.ComponentSchema {
  collectionName: 'components_images_blocks_three_images';
  info: {
    displayName: 'ThreeImagesBlock';
  };
  attributes: {
    desktopImages: Schema.Attribute.Component<'utils-components.image', true> &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          max: 3;
          min: 3;
        },
        number
      >;
    mobileImages: Schema.Attribute.Component<'utils-components.image', true> &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          max: 3;
          min: 3;
        },
        number
      >;
    variant: Schema.Attribute.Enumeration<
      ['horizontal', 'masonry', 'ladder', 'miniatures']
    >;
  };
}

export interface ImagesBlocksTwoImages extends Struct.ComponentSchema {
  collectionName: 'components_images_blocks_two_images';
  info: {
    displayName: 'TwoImagesBlock';
  };
  attributes: {
    desktopImages: Schema.Attribute.Component<'utils-components.image', true> &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          max: 2;
          min: 2;
        },
        number
      >;
    mobileImages: Schema.Attribute.Component<'utils-components.image', true> &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          max: 2;
          min: 2;
        },
        number
      >;
    variant: Schema.Attribute.Enumeration<['double', 'cascade']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'double'>;
  };
}

export interface PageComponentsActivityShowcase extends Struct.ComponentSchema {
  collectionName: 'components_page_components_activity_showcases';
  info: {
    displayName: 'ActivityShowcase';
    icon: 'lightbulb';
  };
  attributes: {
    activity: Schema.Attribute.Relation<'oneToOne', 'api::activity.activity'>;
  };
}

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
    icon: 'question';
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
    description: Schema.Attribute.Text;
    desktopCover: Schema.Attribute.Component<'utils-components.image', false> &
      Schema.Attribute.Required;
    firstLink: Schema.Attribute.Component<'utils-components.link', false>;
    logo: Schema.Attribute.Component<'utils-components.image', false>;
    mobileCover: Schema.Attribute.Component<'utils-components.image', false> &
      Schema.Attribute.Required;
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
    imagesAmount: Schema.Attribute.Enumeration<['one', 'two', 'three']> &
      Schema.Attribute.Required;
    isHighlighted: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    isInverted: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    isVisible: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    link: Schema.Attribute.Component<'utils-components.link', false>;
    oneImageBlock: Schema.Attribute.Component<
      'images-blocks.one-image',
      false
    > &
      Schema.Attribute.Required;
    threeImagesBlock: Schema.Attribute.Component<
      'images-blocks.three-images',
      false
    > &
      Schema.Attribute.Required;
    title: Schema.Attribute.String & Schema.Attribute.Required;
    titleCase: Schema.Attribute.Enumeration<
      ['normal', 'uppercase', 'lowercase', 'capitalize']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'normal'>;
    twoImagesBlock: Schema.Attribute.Component<
      'images-blocks.two-images',
      false
    > &
      Schema.Attribute.Required;
  };
}

export interface PageComponentsPoliciesCallout extends Struct.ComponentSchema {
  collectionName: 'components_page_components_policies_callouts';
  info: {
    description: 'Add at most once per page localization';
    displayName: 'PoliciesCallout';
    icon: 'information';
  };
  attributes: {};
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
    description: Schema.Attribute.Blocks;
    desktopCover: Schema.Attribute.Component<'utils-components.image', false> &
      Schema.Attribute.Required;
    epigraph: Schema.Attribute.Text;
    label: Schema.Attribute.String & Schema.Attribute.Private;
    link: Schema.Attribute.Component<'utils-components.link', false>;
    mobileCover: Schema.Attribute.Component<'utils-components.image', false> &
      Schema.Attribute.Required;
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
    altMode: Schema.Attribute.Enumeration<['asset', 'override', 'decorative']> &
      Schema.Attribute.DefaultTo<'asset'>;
    altOverride: Schema.Attribute.String;
    asset: Schema.Attribute.Relation<
      'oneToOne',
      'api::image-asset.image-asset'
    >;
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

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'images-blocks.one-image': ImagesBlocksOneImage;
      'images-blocks.three-images': ImagesBlocksThreeImages;
      'images-blocks.two-images': ImagesBlocksTwoImages;
      'page-components.activity-showcase': PageComponentsActivityShowcase;
      'page-components.carrousel': PageComponentsCarrousel;
      'page-components.faq-section': PageComponentsFaqSection;
      'page-components.hero': PageComponentsHero;
      'page-components.hours-overview': PageComponentsHoursOverview;
      'page-components.image-text-block': PageComponentsImageTextBlock;
      'page-components.policies-callout': PageComponentsPoliciesCallout;
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
    }
  }
}
