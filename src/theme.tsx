import { createTheme, MantineColorsTuple, rem } from '@mantine/core';
import classes from './styles/theme.module.css';

const brand: MantineColorsTuple = ['#f3f1ff', '#e8e4ff', '#d0c9fc', '#b5aafa', '#9b8ef5', '#8579f2', '#6259df', '#5147ca', '#443baa', '#382f8e'];
const slate: MantineColorsTuple = ['#f7f8fc', '#edf0f7', '#dfe4ef', '#c5cddd', '#a2aec4', '#8794ac', '#65728b', '#46536e', '#28334a', '#141b29'];
const dark: MantineColorsTuple = ['#edf1fa', '#c5cddd', '#a2aec4', '#8794ac', '#46536e', '#354059', '#20283a', '#191f2e', '#141a27', '#101521'];

export const theme = createTheme({
  colors: { brand, slate, dark },
  primaryColor: 'brand',
  primaryShade: { light: 6, dark: 6 },
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  fontSizes: { xs: rem(12), sm: rem(13), md: rem(14), lg: rem(16), xl: rem(20) },
  headings: { fontWeight: '650', sizes: { h1: { fontSize: rem(32), lineHeight: '1.2' }, h2: { fontSize: rem(26), lineHeight: '1.25' }, h3: { fontSize: rem(20), lineHeight: '1.35' } } },
  radius: { xs: rem(6), sm: rem(8), md: rem(12), lg: rem(16), xl: rem(22) },
  defaultRadius: 'md',
  components: {
    Title: { classNames: { root: classes.title } },
    Button: { classNames: { root: classes.button }, defaultProps: { radius: 'md' } },
    Card: { classNames: { root: classes.surface }, defaultProps: { radius: 'lg', padding: 'lg' } },
    Paper: { classNames: { root: classes.surface } },
    Input: { classNames: { input: classes.input }, defaultProps: { radius: 'md' } },
    InputWrapper: { classNames: { label: classes.label, description: classes.description } },
    Select: { classNames: { input: classes.input, label: classes.label, description: classes.description, dropdown: classes.selectDropdown, option: classes.selectOption } },
    Container: { classNames: { root: classes.container } },
    Modal: { classNames: { content: classes.surface, header: classes.modalHeader, body: classes.modalBody, title: classes.modalTitle }, defaultProps: { radius: 'lg', centered: true, overlayProps: { backgroundOpacity: 0.35, blur: 3 } } },
    Popover: { classNames: { dropdown: classes.surface } },
    Menu: { classNames: { dropdown: classes.surface } },
    Progress: { defaultProps: { radius: 'xl', color: 'brand' } },
    Badge: { defaultProps: { variant: 'light', radius: 'sm' }, styles: { root: { textTransform: 'none', fontWeight: 600 } } },
    ActionIcon: { defaultProps: { radius: 'sm' } },
    Tooltip: { defaultProps: { withArrow: true } },
  },
});
