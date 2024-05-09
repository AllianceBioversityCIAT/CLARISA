## Use Widget

1. Add the following HTML tag to your template file where you want to embed the widget:

```html
<div id="dashboard-embed"></div>
```

2. Import the widget.js in your index.html file with the appropriate URL based on the environment:

```html
<script src="https://bitest.ciat.cgiar.org/widget/main.js"></script>
```

Note that the URL may vary depending on the environment you are working in.

3. Next, in your TypeScript component where you want to initialize the widget, declare the pbiwidget variable and use the init method to initialize the widget:

```js
declare var pbiwidget: any;

pbiwidget.init('dashboard-embed', {
  resultType: 'Capacity change', // Parameter
  year: 2022, // Parameter
  reportName: 'type-1-report-dashboard_dev', // Report name
  sectionNumber: 1 // Initial page number
});
```

Make sure to adjust the parameters according to your needs.

# PrmsBiClient

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 15.1.0.

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.
