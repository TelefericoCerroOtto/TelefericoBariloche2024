import donacion from "@/public/donacion.jpg";
import entrada from "@/public/entrada.jpg";
import gomonpistanieve from "@/public/gomonpistanieve.jpg";
import sillaanfibia from "@/public/sillaanfibia.jpg";
import torre from "@/public/torre.jpg";
import type { New } from "@/types/api";

export const news: New[] = [
  {
    id: "0",
    title:
      "Teleférico Cerro Otto inauguró nuevos atractivos e infraestructura en la cumbre, a 1405 metros de altura.",
    summary:
      "Al igual que la tirolesa, pensada y construida para el disfrute de los pasajeros sin padecimientos de ningún tipo, la palestra es atendida por instructores capacitados que se encargan de la colocación de arneses, mosquetones y cascos, tanto como de la...",
    body: "Ambos atractivos están construidos con tecnología francesa de última generación en materia de escalada, bajo estrictas normas internacionales de seguridad y se encuentran en la cima misma de la montaña, por lo que el efecto de altura que genera permite vivir la experiencia a pura adrenalina, sin riesgos mientras se observa un paisaje inconmensurable. En cuanto a gastronomía, además de la tradicional y espléndida CONFITERÍA GIRATORIA, el complejo turístico dispone actualmente de lo que se ha dado en llamar “REFUGIO DEL CERRO OTTO”, en el que la estrella principal es su PARRILLA, para degustar riquísimos y generosos sándwiches de bondiola con rúcula y cebolla caramelizada y el tradicional “choripán”. Además la carta ofrece clásicas picadas de fiambres surtidos y también una opción vegetariana: sándwich de coleslaw (repollo, zanahoria, tomate, rúcula, salsa de mostaza, mayonesa clásica y de albahaca, y queso gruyere. Imposible describir el sabor del pan artesanal, siempre elaborado en el día, tanto como de los “chipá” con verdaderas receta y harina paraguaya, para quienes desean algo rápido sin dejar de saborear un buen producto!!!",
    featured: true,
    legend:
      "Este verano 2023, Complejo Turístico Teleférico Cerro Otto ha inaugurado atractivos e infraestructura para brindar mayor comodidad a sus visitantes.",
    images: {
      cover: {
        src: gomonpistanieve.src,
        alt: "Niño tirandose en un gomon por una pista de nieve",
      },
      thumbnail: {
        src: gomonpistanieve.src,
        alt: "Niño tirandose en un gomon por una pista de nieve",
      },
    },
    pubDate: new Date(),
  },
  {
    id: "1",
    title:
      "La Fundación S.M. Furman donó a la Municipalidad de Bariloche, la primera silla anfibia para...",
    summary:
      "El Presidente de la Fundación Furman, Edgardo Véliz, formalizó hoy la entrega de esta silla anfibia para personas con discapacidad, que se transforma así...",
    body: "Lorem ipsum dolor sit, amet consectetur adipisicing elit. Consequatur blanditiis dolores voluptatem nihil quas, dignissimos nemo magni aspernatur neque unde exercitationem sapiente. Itaque sit ab modi, dolorum ipsam magni eius?",
    featured: false,
    legend:
      "Este verano 2023, Complejo Turístico Teleférico Cerro Otto ha inaugurado atractivos e infraestructura para brindar mayor comodidad a sus visitantes.",
    pubDate: new Date(),
    images: {
      cover: {
        src: sillaanfibia.src,
        alt: "Silla de ruedas con flotadores para el agua",
      },
      thumbnail: {
        src: sillaanfibia.src,
        alt: "Silla de ruedas con flotadores para el agua",
      },
    },
  },
  {
    id: "2",
    title:
      "Complejo Turístico Teleférico Cerro Otto recomienda tener en cuenta las siguientes informaciones a la hora...",
    summary:
      "Complejo Turístico Teleférico Cerro Otto recomienda a la comunidad en general, a operadores, agencias de viajes y turismo y a los señores visitantes tener en cuenta...",
    body: "Lorem ipsum dolor sit, amet consectetur adipisicing elit. Consequatur blanditiis dolores voluptatem nihil quas, dignissimos nemo magni aspernatur neque unde exercitationem sapiente. Itaque sit ab modi, dolorum ipsam magni eius?",
    featured: false,
    legend:
      "Este verano 2023, Complejo Turístico Teleférico Cerro Otto ha inaugurado atractivos e infraestructura para brindar mayor comodidad a sus visitantes.",
    pubDate: new Date(),
    images: {
      cover: {
        src: torre.src,
        alt: "Silla de ruedas con flotadores para el agua",
      },
      thumbnail: {
        src: torre.src,
        alt: "Silla de ruedas con flotadores para el agua",
      },
    },
  },
  {
    id: "3",
    title:
      "Concierto gratuito de los niños de la orquesta villa los coihues en la estacion inferior de teleferico cerro otto",
    summary:
      "Este domingo, 25 de septiembre, a las 12 horas, como una manera de agasajar la llegada de la primavera, la Orquesta “Villa Los Coihues” de la Escuela 324...",
    body: "Lorem ipsum dolor sit, amet consectetur adipisicing elit. Consequatur blanditiis dolores voluptatem nihil quas, dignissimos nemo magni aspernatur neque unde exercitationem sapiente. Itaque sit ab modi, dolorum ipsam magni eius?",
    featured: false,
    legend:
      "Este verano 2023, Complejo Turístico Teleférico Cerro Otto ha inaugurado atractivos e infraestructura para brindar mayor comodidad a sus visitantes.",
    pubDate: new Date(),
    images: {
      cover: {
        src: entrada.src,
        alt: "Silla de ruedas con flotadores para el agua",
      },
      thumbnail: {
        src: entrada.src,
        alt: "Silla de ruedas con flotadores para el agua",
      },
    },
  },
  {
    id: "4",
    title:
      "Once millones de pesos es la nueva donacion de la fundacion S.M Furman a entidades de bien publico",
    summary:
      "En una cena ofrecida a la prensa, el Presidente, el Vicepresidente y el Tesorero del Consejo de Administración de la Fundación Sara María Furman...",
    body: "Lorem ipsum dolor sit, amet consectetur adipisicing elit. Consequatur blanditiis dolores voluptatem nihil quas, dignissimos nemo magni aspernatur neque unde exercitationem sapiente. Itaque sit ab modi, dolorum ipsam magni eius?",
    featured: false,
    legend:
      "Este verano 2023, Complejo Turístico Teleférico Cerro Otto ha inaugurado atractivos e infraestructura para brindar mayor comodidad a sus visitantes.",
    pubDate: new Date(),
    images: {
      cover: {
        src: donacion.src,
        alt: "Silla de ruedas con flotadores para el agua",
      },
      thumbnail: {
        src: donacion.src,
        alt: "Silla de ruedas con flotadores para el agua",
      },
    },
  },
  {
    id: "5",
    title:
      "La Fundación S.M. Furman donó a la Municipalidad de Bariloche, la primera silla anfibia para...",
    summary:
      "El Presidente de la Fundación Furman, Edgardo Véliz, formalizó hoy la entrega de esta silla anfibia para personas con discapacidad, que se transforma así...",
    body: "Lorem ipsum dolor sit, amet consectetur adipisicing elit. Consequatur blanditiis dolores voluptatem nihil quas, dignissimos nemo magni aspernatur neque unde exercitationem sapiente. Itaque sit ab modi, dolorum ipsam magni eius?",
    featured: false,
    legend:
      "Este verano 2023, Complejo Turístico Teleférico Cerro Otto ha inaugurado atractivos e infraestructura para brindar mayor comodidad a sus visitantes.",
    pubDate: new Date(),
    images: {
      cover: {
        src: sillaanfibia.src,
        alt: "Silla de ruedas con flotadores para el agua",
      },
      thumbnail: {
        src: sillaanfibia.src,
        alt: "Silla de ruedas con flotadores para el agua",
      },
    },
  },
  {
    id: "6",
    title:
      "Complejo Turístico Teleférico Cerro Otto recomienda tener en cuenta las siguientes informaciones a la hora...",
    summary:
      "Complejo Turístico Teleférico Cerro Otto recomienda a la comunidad en general, a operadores, agencias de viajes y turismo y a los señores visitantes tener en cuenta...",
    body: "Lorem ipsum dolor sit, amet consectetur adipisicing elit. Consequatur blanditiis dolores voluptatem nihil quas, dignissimos nemo magni aspernatur neque unde exercitationem sapiente. Itaque sit ab modi, dolorum ipsam magni eius?",
    featured: false,
    legend:
      "Este verano 2023, Complejo Turístico Teleférico Cerro Otto ha inaugurado atractivos e infraestructura para brindar mayor comodidad a sus visitantes.",
    pubDate: new Date(),
    images: {
      cover: {
        src: torre.src,
        alt: "Silla de ruedas con flotadores para el agua",
      },
      thumbnail: {
        src: torre.src,
        alt: "Silla de ruedas con flotadores para el agua",
      },
    },
  },
  {
    id: "7",
    title:
      "Concierto gratuito de los niños de la orquesta villa los coihues en la estacion inferior de teleferico cerro otto",
    summary:
      "Este domingo, 25 de septiembre, a las 12 horas, como una manera de agasajar la llegada de la primavera, la Orquesta “Villa Los Coihues” de la Escuela 324...",
    body: "Lorem ipsum dolor sit, amet consectetur adipisicing elit. Consequatur blanditiis dolores voluptatem nihil quas, dignissimos nemo magni aspernatur neque unde exercitationem sapiente. Itaque sit ab modi, dolorum ipsam magni eius?",
    featured: false,
    legend:
      "Este verano 2023, Complejo Turístico Teleférico Cerro Otto ha inaugurado atractivos e infraestructura para brindar mayor comodidad a sus visitantes.",
    pubDate: new Date(),
    images: {
      cover: {
        src: entrada.src,
        alt: "Silla de ruedas con flotadores para el agua",
      },
      thumbnail: {
        src: entrada.src,
        alt: "Silla de ruedas con flotadores para el agua",
      },
    },
  },
  {
    id: "8",
    title:
      "Once millones de pesos es la nueva donacion de la fundacion S.M Furman a entidades de bien publico",
    summary:
      "En una cena ofrecida a la prensa, el Presidente, el Vicepresidente y el Tesorero del Consejo de Administración de la Fundación Sara María Furman...",
    body: "Lorem ipsum dolor sit, amet consectetur adipisicing elit. Consequatur blanditiis dolores voluptatem nihil quas, dignissimos nemo magni aspernatur neque unde exercitationem sapiente. Itaque sit ab modi, dolorum ipsam magni eius?",
    featured: false,
    legend:
      "Este verano 2023, Complejo Turístico Teleférico Cerro Otto ha inaugurado atractivos e infraestructura para brindar mayor comodidad a sus visitantes.",
    pubDate: new Date(),
    images: {
      cover: {
        src: donacion.src,
        alt: "Silla de ruedas con flotadores para el agua",
      },
      thumbnail: {
        src: donacion.src,
        alt: "Silla de ruedas con flotadores para el agua",
      },
    },
  },
  {
    id: "9",
    title:
      "La Fundación S.M. Furman donó a la Municipalidad de Bariloche, la primera silla anfibia para...",
    summary:
      "El Presidente de la Fundación Furman, Edgardo Véliz, formalizó hoy la entrega de esta silla anfibia para personas con discapacidad, que se transforma así...",
    body: "Lorem ipsum dolor sit, amet consectetur adipisicing elit. Consequatur blanditiis dolores voluptatem nihil quas, dignissimos nemo magni aspernatur neque unde exercitationem sapiente. Itaque sit ab modi, dolorum ipsam magni eius?",
    featured: false,
    legend:
      "Este verano 2023, Complejo Turístico Teleférico Cerro Otto ha inaugurado atractivos e infraestructura para brindar mayor comodidad a sus visitantes.",
    pubDate: new Date(),
    images: {
      cover: {
        src: sillaanfibia.src,
        alt: "Silla de ruedas con flotadores para el agua",
      },
      thumbnail: {
        src: sillaanfibia.src,
        alt: "Silla de ruedas con flotadores para el agua",
      },
    },
  },
  {
    id: "10",
    title:
      "Complejo Turístico Teleférico Cerro Otto recomienda tener en cuenta las siguientes informaciones a la hora...",
    summary:
      "Complejo Turístico Teleférico Cerro Otto recomienda a la comunidad en general, a operadores, agencias de viajes y turismo y a los señores visitantes tener en cuenta...",
    body: "Lorem ipsum dolor sit, amet consectetur adipisicing elit. Consequatur blanditiis dolores voluptatem nihil quas, dignissimos nemo magni aspernatur neque unde exercitationem sapiente. Itaque sit ab modi, dolorum ipsam magni eius?",
    featured: false,
    legend:
      "Este verano 2023, Complejo Turístico Teleférico Cerro Otto ha inaugurado atractivos e infraestructura para brindar mayor comodidad a sus visitantes.",
    pubDate: new Date(),
    images: {
      cover: {
        src: torre.src,
        alt: "Silla de ruedas con flotadores para el agua",
      },
      thumbnail: {
        src: torre.src,
        alt: "Silla de ruedas con flotadores para el agua",
      },
    },
  },
  {
    id: "11",
    title:
      "Concierto gratuito de los niños de la orquesta villa los coihues en la estacion inferior de teleferico cerro otto",
    summary:
      "Este domingo, 25 de septiembre, a las 12 horas, como una manera de agasajar la llegada de la primavera, la Orquesta “Villa Los Coihues” de la Escuela 324...",
    body: "Lorem ipsum dolor sit, amet consectetur adipisicing elit. Consequatur blanditiis dolores voluptatem nihil quas, dignissimos nemo magni aspernatur neque unde exercitationem sapiente. Itaque sit ab modi, dolorum ipsam magni eius?",
    featured: false,
    legend:
      "Este verano 2023, Complejo Turístico Teleférico Cerro Otto ha inaugurado atractivos e infraestructura para brindar mayor comodidad a sus visitantes.",
    pubDate: new Date(),
    images: {
      cover: {
        src: entrada.src,
        alt: "Silla de ruedas con flotadores para el agua",
      },
      thumbnail: {
        src: entrada.src,
        alt: "Silla de ruedas con flotadores para el agua",
      },
    },
  },
  {
    id: "12",
    title:
      "Once millones de pesos es la nueva donacion de la fundacion S.M Furman a entidades de bien publico",
    summary:
      "En una cena ofrecida a la prensa, el Presidente, el Vicepresidente y el Tesorero del Consejo de Administración de la Fundación Sara María Furman...",
    body: "Lorem ipsum dolor sit, amet consectetur adipisicing elit. Consequatur blanditiis dolores voluptatem nihil quas, dignissimos nemo magni aspernatur neque unde exercitationem sapiente. Itaque sit ab modi, dolorum ipsam magni eius?",
    featured: false,
    legend:
      "Este verano 2023, Complejo Turístico Teleférico Cerro Otto ha inaugurado atractivos e infraestructura para brindar mayor comodidad a sus visitantes.",
    pubDate: new Date(),
    images: {
      cover: {
        src: donacion.src,
        alt: "Silla de ruedas con flotadores para el agua",
      },
      thumbnail: {
        src: donacion.src,
        alt: "Silla de ruedas con flotadores para el agua",
      },
    },
  },
];
