% run in 'preprocessing' directory

[im, map, alpha] = imread('img/fragments.png');
size = 128;
gap = 5;

indexify_option = true;

digimon = {
    'vikemon', 'wargreymon', 'imperialdramon-fm', 'chaosgallantmon', 'gaiomon', 'examon', 'ophanimon', 'gankoomon', 'groundlocomon', 'kuzuhamon';
    'grankuwagamon', 'sakuyamon', 'saberleomon', 'craniamon', 'cherubimon-good', 'justimon', 'shinegreymon', 'kentaurosmon', 'jesmon', 'seraphimon';
    'tigervespamon', 'megagargomon', 'titamon', 'gallantmon', 'dianamon', 'creepymon', 'diaboromon', 'barbamon', 'dynasmon', 'hiandromon';
    'leopardmon', 'bancholeomon', 'platinumnumemon', 'puppetmon', 'piedmon', 'plesiomon', 'princemamemon', 'blackwargreymon', 'herculeskabuterimon', 'belphemon-sm';
    'magnadramon', 'beelzemon', 'phoenixmon', 'mastemon', 'minervamon', 'boltmon', 'marineangemon', 'machinedramon', 'miragegaogamon', 'metaletemon';
    'metalgarurumon', 'metalgarurumon-black', 'leviamon', 'metalseadramon', 'rusttyranomon', 'lilithmon', 'ravemon', 'rosemon', 'lordknightmon', 'imperialdramon-pm';
    'omegamon', 'omegamon-zwart', 'lotosmon', 'flamedramon', 'leopardmon-lm', 'lucemon-sm', 'belphemon-rm', 'susanoomon', 'meicrackmon-vm', 'rapidmon-gold';
    'magnamon', 'omegamon-zwart-d', 'omegamon-alter-b', 'gallantmon-cm', 'jijimon', 'volcanicdramon', 'arresterdramon', 'omega-shoutmon', 'shinegreymon-bm', 'kimeramon';
    'ravemon-bm', 'rosemon-bm', 'miragegaogamon-bm', 'brakedramon', 'millenniummon', 'chaosdramon', 'slayerdramon', 'blackwargreymon-x', 'metalgarurumon-x', 'shinegreymon-rm';
    'raguelmon', 'sakuyamon-mutant', 'herculeskabuterimon-mutant', 'shinegreymon-mutant', 'gaiomon-mutant', 'dianamon-mutant', 'leviamon-mutant', 'plesiomon-mutant', 'venommyotismon', ''
};

mkdir('../img/fragments/');
for y = 1:10
    for x = 1:10
        if y == 10 && x == 10
            break
        end
        name = ['../img/fragments/', digimon{y, x}, '.png'];
        ya = (size + gap) * (y - 1) + gap + 1;
        xa = (size + gap) * (x - 1) + gap + 1;
        yb = (size + gap) * y;
        xb = (size + gap) * x;
        if indexify_option
            [fragment, map] = rgb2ind(im(ya:yb, xa:xb, :), 64, 'nodither');
            imwrite(fragment, map, name);
        else
            imwrite(im(ya:yb, xa:xb, :), name, 'Alpha', alpha(ya:yb, xa:xb));
        end
    end
end
